<?php

namespace App\Http\Controllers;

use App\Models\Prompt;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class PromptController extends Controller
{
    private const SORT_NEWEST = 'newest';

    private const SORT_POPULAR = 'popular';

    private const SORT_MOST_COPIED = 'most_copied';

    private const SORT_OLDEST = 'oldest';

    private const SORT_CATEGORY = 'category';

    private const SORTS = [
        self::SORT_NEWEST,
        self::SORT_POPULAR,
        self::SORT_MOST_COPIED,
        self::SORT_OLDEST,
        self::SORT_CATEGORY,
    ];

    public function home(Request $request): Response
    {
        return $this->index($request);
    }

    public function index(Request $request): Response
    {
        $search = trim((string) $request->string('search'));
        $category = (string) $request->string('category');
        $category = in_array($category, Prompt::CATEGORIES, true) ? $category : null;
        $sort = (string) $request->string('sort', self::SORT_NEWEST);
        $sort = in_array($sort, self::SORTS, true) ? $sort : self::SORT_NEWEST;
        $libraryTotals = Prompt::query()
            ->completed()
            ->toBase()
            ->selectRaw('count(*) as total, coalesce(sum(copy_count), 0) as copies')
            ->first();
        $completedTotal = (int) ($libraryTotals->total ?? 0);
        $totalCopies = (int) ($libraryTotals->copies ?? 0);
        $newestCategory = Prompt::query()
            ->completed()
            ->latest('generated_at')
            ->latest()
            ->value('category');
        $newestCategory = is_string($newestCategory) && in_array($newestCategory, Prompt::CATEGORIES, true)
            ? $newestCategory
            : null;
        $categoryCounts = Prompt::query()
            ->completed()
            ->selectRaw('category, count(*) as aggregate')
            ->whereNotNull('category')
            ->groupBy('category')
            ->pluck('aggregate', 'category');
        $modelCounts = Prompt::query()
            ->completed()
            ->selectRaw('ai_model, count(*) as aggregate')
            ->whereNotNull('ai_model')
            ->groupBy('ai_model')
            ->orderByDesc('aggregate')
            ->limit(6)
            ->pluck('aggregate', 'ai_model')
            ->map(fn (mixed $count, mixed $model): array => [
                'model' => (string) $model,
                'label' => $this->modelLabel((string) $model),
                'count' => (int) $count,
            ])
            ->values()
            ->all();

        $query = Prompt::query()
            ->with('user:id,name')
            ->completed()
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($query) use ($search): void {
                    $query->where('title', 'like', "%{$search}%")
                        ->orWhere('prompt', 'like', "%{$search}%")
                        ->orWhere('category', 'like', "%{$search}%");
                });
            })
            ->when($category !== null, fn ($query) => $query->where('category', $category));

        match ($sort) {
            self::SORT_POPULAR => $query->orderByDesc('copy_count')
                ->latest('generated_at')
                ->latest(),
            self::SORT_MOST_COPIED => $query->orderByDesc('copy_count')
                ->latest(),
            self::SORT_OLDEST => $query->oldest('generated_at')
                ->oldest(),
            self::SORT_CATEGORY => $query->orderBy('category')
                ->latest('generated_at')
                ->latest(),
            default => $query->latest('generated_at')
                ->latest(),
        };

        $prompts = $query
            ->paginate(12)
            ->withQueryString()
            ->through(fn (Prompt $prompt): array => $this->promptData($prompt));

        $suggestedPrompts = Prompt::query()
            ->with('user:id,name')
            ->completed()
            ->latest('generated_at')
            ->latest()
            ->limit(4)
            ->get()
            ->map(fn (Prompt $prompt): array => $this->promptData($prompt))
            ->values();

        return Inertia::render('prompts/index', [
            'prompts' => $prompts,
            'categories' => Prompt::CATEGORIES,
            'categoryCounts' => collect(Prompt::CATEGORIES)
                ->mapWithKeys(fn (string $category): array => [
                    $category => (int) ($categoryCounts[$category] ?? 0),
                ])
                ->all(),
            'sorts' => self::SORTS,
            'suggestedPrompts' => $suggestedPrompts,
            'trendingSearches' => $this->trendData($categoryCounts),
            'collections' => $this->collectionData($categoryCounts),
            'modelCounts' => $modelCounts,
            'totalCompleted' => $completedTotal,
            'totalCopies' => $totalCopies,
            'newestCategory' => $newestCategory,
            'filters' => [
                'search' => $search,
                'category' => $category,
                'sort' => $sort,
            ],
        ]);
    }

    public function show(Prompt $prompt): Response
    {
        abort_unless($prompt->status === Prompt::STATUS_COMPLETED, 404);

        $prompt->loadMissing('user:id,name');

        return Inertia::render('prompts/show', [
            'promptItem' => $this->promptData($prompt),
            'categories' => Prompt::CATEGORIES,
            'categoryCounts' => $this->completedCategoryCounts(),
            'relatedPrompts' => $this->relatedPrompts($prompt),
        ]);
    }

    public function copy(Prompt $prompt): JsonResponse
    {
        $updated = Prompt::query()
            ->completed()
            ->whereKey($prompt->id)
            ->increment('copy_count');

        abort_unless($updated === 1, 404);

        return response()->json([
            'copy_count' => (int) Prompt::query()
                ->whereKey($prompt->id)
                ->value('copy_count'),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    protected function promptData(Prompt $prompt): array
    {
        $promptText = $prompt->prompt ?? '';
        $thumbnailUrl = $prompt->thumbnail_path === null
            ? null
            : Storage::disk('public')->url($prompt->thumbnail_path);
        $referenceImageUrl = $prompt->reference_image_path === null
            ? $thumbnailUrl
            : Storage::disk('public')->url($prompt->reference_image_path);

        return [
            'id' => $prompt->id,
            'title' => $prompt->title,
            'prompt' => $prompt->prompt,
            'prompt_preview' => Str::of($promptText)->squish()->limit(170)->toString(),
            'negative_prompt' => $prompt->negative_prompt,
            'thumbnail_prompt' => $prompt->thumbnail_prompt,
            'thumbnail_url' => $thumbnailUrl,
            'reference_image_url' => $referenceImageUrl,
            'detail_url' => route('prompts.show', $prompt),
            'generation_mode' => $prompt->generation_mode,
            'source_idea' => $prompt->source_idea,
            'category' => $prompt->category,
            'style_notes' => $prompt->style_notes,
            'copy_count' => $prompt->copy_count,
            'source_label' => $prompt->relationLoaded('user') ? $prompt->user?->name : null,
            'model_label' => $this->modelLabel($prompt->ai_model),
            'generated_at' => $prompt->generated_at?->toIso8601String(),
            'created_at' => $prompt->created_at?->toIso8601String(),
        ];
    }

    /**
     * @return array<string, int>
     */
    private function completedCategoryCounts(): array
    {
        $counts = Prompt::query()
            ->completed()
            ->selectRaw('category, count(*) as aggregate')
            ->whereNotNull('category')
            ->groupBy('category')
            ->pluck('aggregate', 'category');

        return collect(Prompt::CATEGORIES)
            ->mapWithKeys(fn (string $category): array => [
                $category => (int) ($counts[$category] ?? 0),
            ])
            ->all();
    }

    /**
     * @param  Collection<int|string, mixed>  $categoryCounts
     * @return list<array{label: string, category: string, search: string, count: int}>
     */
    private function trendData(Collection $categoryCounts): array
    {
        return array_values(collect(Prompt::CATEGORIES)
            ->filter(fn (string $category): bool => (int) ($categoryCounts[$category] ?? 0) > 0)
            ->map(fn (string $category): array => [
                'label' => $this->categoryTitle($category),
                'category' => $category,
                'search' => '',
                'count' => (int) ($categoryCounts[$category] ?? 0),
            ])
            ->values()
            ->all());
    }

    /**
     * @param  Collection<int|string, mixed>  $categoryCounts
     * @return list<array{category: string, title: string, description: string, prompt_count: int, thumbnails: list<string>}>
     */
    private function collectionData(Collection $categoryCounts): array
    {
        return array_values(collect(Prompt::CATEGORIES)
            ->filter(fn (string $category): bool => (int) ($categoryCounts[$category] ?? 0) > 0)
            ->map(fn (string $category): array => [
                'category' => $category,
                'title' => $this->categoryTitle($category),
                'description' => $this->categoryDescription($category),
                'prompt_count' => (int) ($categoryCounts[$category] ?? 0),
                'thumbnails' => array_values(Prompt::query()
                    ->completed()
                    ->where('category', $category)
                    ->whereNotNull('thumbnail_path')
                    ->latest('generated_at')
                    ->latest()
                    ->limit(3)
                    ->pluck('thumbnail_path')
                    ->map(fn (string $path): string => Storage::disk('public')->url($path))
                    ->values()
                    ->all()),
            ])
            ->values()
            ->all());
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function relatedPrompts(Prompt $prompt): array
    {
        return array_values(Prompt::query()
            ->with('user:id,name')
            ->completed()
            ->whereKeyNot($prompt->id)
            ->when(
                $prompt->category !== null,
                fn ($query) => $query->where('category', $prompt->category),
            )
            ->latest('generated_at')
            ->latest()
            ->limit(4)
            ->get()
            ->map(fn (Prompt $prompt): array => $this->promptData($prompt))
            ->values()
            ->all());
    }

    private function categoryTitle(string $category): string
    {
        return match ($category) {
            Prompt::CATEGORY_PORTRAIT => 'Portrait',
            Prompt::CATEGORY_PRODUCT => 'Product',
            Prompt::CATEGORY_FASHION => 'Fashion',
            Prompt::CATEGORY_LIFESTYLE => 'Lifestyle',
            Prompt::CATEGORY_ART => 'Art',
            default => 'Other',
        };
    }

    private function categoryDescription(string $category): string
    {
        return match ($category) {
            Prompt::CATEGORY_PORTRAIT => 'Faces, expressions, headshots, and character-led framing.',
            Prompt::CATEGORY_PRODUCT => 'Commercial product scenes, tabletop light, and clean catalog direction.',
            Prompt::CATEGORY_FASHION => 'Editorial poses, garments, campaign frames, and runway energy.',
            Prompt::CATEGORY_LIFESTYLE => 'Natural environments, couples, travel, wellness, and everyday scenes.',
            Prompt::CATEGORY_ART => 'Painterly direction, illustration, digital art, and concept worlds.',
            default => 'Experimental references and prompts outside the core creative categories.',
        };
    }

    private function modelLabel(?string $model): ?string
    {
        if ($model === null || trim($model) === '') {
            return null;
        }

        return Str::of($model)
            ->replace(['-', '_'], ' ')
            ->title()
            ->toString();
    }
}
