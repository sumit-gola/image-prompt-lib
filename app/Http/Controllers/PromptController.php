<?php

namespace App\Http\Controllers;

use App\Models\Prompt;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class PromptController extends Controller
{
    private const SORT_NEWEST = 'newest';

    private const SORT_MOST_COPIED = 'most_copied';

    private const SORT_OLDEST = 'oldest';

    private const SORT_CATEGORY = 'category';

    private const SORTS = [
        self::SORT_NEWEST,
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
        $completedTotal = Prompt::query()->completed()->count();
        $categoryCounts = Prompt::query()
            ->completed()
            ->selectRaw('category, count(*) as aggregate')
            ->whereNotNull('category')
            ->groupBy('category')
            ->pluck('aggregate', 'category');

        $query = Prompt::query()
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
            self::SORT_MOST_COPIED => $query->orderByDesc('copy_count')
                ->latest('generated_at')
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
            'totalCompleted' => $completedTotal,
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

        return Inertia::render('prompts/show', [
            'promptItem' => $this->promptData($prompt),
        ]);
    }

    public function copy(Prompt $prompt): JsonResponse
    {
        abort_unless($prompt->status === Prompt::STATUS_COMPLETED, 404);

        $prompt->increment('copy_count');
        $prompt->refresh();

        return response()->json([
            'copy_count' => $prompt->copy_count,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    protected function promptData(Prompt $prompt): array
    {
        $promptText = $prompt->prompt ?? '';

        return [
            'id' => $prompt->id,
            'title' => $prompt->title,
            'prompt' => $prompt->prompt,
            'prompt_preview' => Str::of($promptText)->squish()->limit(170)->toString(),
            'negative_prompt' => $prompt->negative_prompt,
            'thumbnail_url' => Storage::disk('public')->url($prompt->thumbnail_path),
            'reference_image_url' => Storage::disk('public')->url($prompt->reference_image_path),
            'detail_url' => route('prompts.show', $prompt),
            'category' => $prompt->category,
            'style_notes' => $prompt->style_notes,
            'copy_count' => $prompt->copy_count,
            'generated_at' => $prompt->generated_at?->toIso8601String(),
            'created_at' => $prompt->created_at?->toIso8601String(),
        ];
    }
}
