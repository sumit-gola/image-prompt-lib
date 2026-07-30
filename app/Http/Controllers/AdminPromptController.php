<?php

namespace App\Http\Controllers;

use App\Actions\Prompts\BuildPromptStatusSummary;
use App\Actions\Prompts\ResolvePromptLibraryAiConfiguration;
use App\Actions\Prompts\ResolvePromptLibraryImageConfiguration;
use App\Actions\Prompts\StoreAutoPrompt;
use App\Actions\Prompts\StorePromptReferenceImages;
use App\Http\Requests\BulkUpdatePromptsRequest;
use App\Http\Requests\StoreAutoPromptRequest;
use App\Http\Requests\StorePromptReferenceImagesRequest;
use App\Http\Requests\UpdatePromptRequest;
use App\Jobs\GenerateAutoPromptJob;
use App\Jobs\GeneratePromptFromReferenceImageJob;
use App\Models\Prompt;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class AdminPromptController extends Controller
{
    private const SORT_NEWEST = 'newest';

    private const SORT_OLDEST = 'oldest';

    private const SORT_MOST_COPIED = 'most_copied';

    private const SORT_TITLE = 'title';

    private const SORT_STATUS = 'status';

    private const SORT_CATEGORY = 'category';

    private const SORT_GENERATION_MODE = 'generation_mode';

    private const SORTS = [
        self::SORT_NEWEST,
        self::SORT_OLDEST,
        self::SORT_MOST_COPIED,
        self::SORT_TITLE,
        self::SORT_STATUS,
        self::SORT_CATEGORY,
        self::SORT_GENERATION_MODE,
    ];

    private const PER_PAGE_OPTIONS = [24, 48, 96];

    public function index(
        Request $request,
        BuildPromptStatusSummary $buildPromptStatusSummary,
        ResolvePromptLibraryAiConfiguration $aiConfiguration,
        ResolvePromptLibraryImageConfiguration $imageConfiguration,
    ): Response {
        Gate::authorize('create', Prompt::class);

        $filters = $this->filters($request);
        $query = Prompt::query()
            ->with('user:id,name,email')
            ->search($filters['search'])
            ->withStatus($filters['status'])
            ->withCategory($filters['category'])
            ->withGenerationMode($filters['generation_mode'])
            ->withSourceSite($filters['source_site'])
            ->when($filters['created_from'] !== null, fn ($query) => $query->whereDate('created_at', '>=', $filters['created_from']))
            ->when($filters['created_to'] !== null, fn ($query) => $query->whereDate('created_at', '<=', $filters['created_to']))
            ->when($filters['generated_from'] !== null, fn ($query) => $query->whereDate('generated_at', '>=', $filters['generated_from']))
            ->when($filters['generated_to'] !== null, fn ($query) => $query->whereDate('generated_at', '<=', $filters['generated_to']));

        $this->applySort($query, $filters['sort']);

        $prompts = $query
            ->paginate($filters['per_page'])
            ->withQueryString()
            ->through(fn (Prompt $prompt): array => $this->adminPromptData($prompt));

        return Inertia::render('admin/prompts/index', [
            'prompts' => $prompts,
            'statuses' => Prompt::STATUSES,
            'categories' => Prompt::CATEGORIES,
            'generationModes' => Prompt::GENERATION_MODES,
            'sourceSites' => ['local', 'promptplum'],
            'sorts' => self::SORTS,
            'filters' => $filters,
            'summary' => $buildPromptStatusSummary->handle(),
            'aiConfiguration' => $aiConfiguration->handle(),
            'imageAiConfiguration' => $imageConfiguration->handle(),
            'requiresPolling' => Prompt::query()
                ->whereIn('status', [Prompt::STATUS_PENDING, Prompt::STATUS_PROCESSING])
                ->exists(),
        ]);
    }

    public function edit(Prompt $prompt): Response
    {
        Gate::authorize('update', $prompt);

        $prompt->loadMissing('user:id,name,email');

        return Inertia::render('admin/prompts/edit', [
            'promptItem' => $this->adminPromptData($prompt),
            'statuses' => Prompt::STATUSES,
            'categories' => Prompt::CATEGORIES,
        ]);
    }

    public function store(StorePromptReferenceImagesRequest $request, StorePromptReferenceImages $store): RedirectResponse
    {
        $user = $request->user();

        abort_unless($user instanceof User, 403);

        $prompts = $store->handle($user, $request->file('images', []));

        return redirect()
            ->route('admin.prompts.index')
            ->with('success', $prompts->count().' reference image'.($prompts->count() === 1 ? '' : 's').' queued for prompt generation.');
    }

    public function storeAuto(StoreAutoPromptRequest $request, StoreAutoPrompt $store): RedirectResponse
    {
        $user = $request->user();

        abort_unless($user instanceof User, 403);

        /** @var array{idea: string, category: string, visual_style?: string|null, subject?: string|null, mood?: string|null, lighting?: string|null, camera_notes?: string|null, target_model_notes?: string|null, negative_notes?: string|null} $data */
        $data = $request->validated();

        $store->handle($user, $data);

        return redirect()
            ->route('admin.prompts.index')
            ->with('success', 'Auto prompt generation queued.');
    }

    public function destroy(Prompt $prompt): RedirectResponse
    {
        Gate::authorize('delete', $prompt);

        $this->deletePromptAssets($prompt);

        $prompt->delete();

        return back()->with('success', 'Prompt deleted.');
    }

    public function update(UpdatePromptRequest $request, Prompt $prompt): RedirectResponse
    {
        /** @var array{title: string, prompt?: string|null, negative_prompt?: string|null, thumbnail_prompt?: string|null, category?: string|null, status: string, generated_at?: string|null, style_notes?: array<string, string|null>|null} $data */
        $data = $request->validated();

        $attributes = [
            'title' => $data['title'],
            'prompt' => $this->nullableText($data['prompt'] ?? null),
            'negative_prompt' => $this->nullableText($data['negative_prompt'] ?? null),
            'thumbnail_prompt' => $this->nullableText($data['thumbnail_prompt'] ?? null),
            'category' => $data['category'] ?? null,
            'status' => $data['status'],
            'style_notes' => $this->styleNotes($data['style_notes'] ?? null),
            'generated_at' => $this->parseDate($data['generated_at'] ?? null),
        ];

        $thumbnail = $request->file('thumbnail');

        if ($thumbnail instanceof UploadedFile) {
            $this->deleteStoragePath($prompt->thumbnail_path);
            $attributes['thumbnail_path'] = $this->storePromptImage($thumbnail, 'prompts/thumbnails');
        }

        $referenceImage = $request->file('reference_image');

        if ($referenceImage instanceof UploadedFile) {
            $this->deleteStoragePath($prompt->reference_image_path);
            $attributes['reference_image_path'] = $this->storePromptImage($referenceImage, 'prompts/references');
        }

        $prompt->update($attributes);

        return back()->with('success', 'Prompt updated.');
    }

    public function bulk(BulkUpdatePromptsRequest $request): RedirectResponse
    {
        /** @var array{action: string, prompt_ids: list<int>, status?: string|null, category?: string|null} $data */
        $data = $request->validated();
        $prompts = Prompt::query()->whereKey($data['prompt_ids'])->get();

        if ($prompts->count() !== count($data['prompt_ids'])) {
            return back()->withErrors(['bulk' => 'One or more selected prompts could not be found.']);
        }

        $status = $data['status'] ?? null;
        $category = $data['category'] ?? null;

        return match ($data['action']) {
            BulkUpdatePromptsRequest::ACTION_DELETE => $this->bulkDelete($prompts),
            BulkUpdatePromptsRequest::ACTION_STATUS => is_string($status)
                ? $this->bulkStatus($prompts, $status)
                : back()->withErrors(['bulk' => 'Choose the replacement status.']),
            BulkUpdatePromptsRequest::ACTION_CATEGORY => is_string($category)
                ? $this->bulkCategory($prompts, $category)
                : back()->withErrors(['bulk' => 'Choose the replacement category.']),
            BulkUpdatePromptsRequest::ACTION_RETRY => $this->bulkRetry($prompts),
            BulkUpdatePromptsRequest::ACTION_PUBLISH => $this->bulkPublish($prompts),
            BulkUpdatePromptsRequest::ACTION_DRAFT => $this->bulkDraft($prompts),
            default => back()->withErrors(['bulk' => 'Unsupported bulk action.']),
        };
    }

    public function regenerate(Prompt $prompt): RedirectResponse
    {
        Gate::authorize('regenerate', $prompt);
        abort_unless($this->canRegeneratePrompt($prompt), 422, 'This prompt cannot be regenerated.');

        $this->resetAndDispatchRegeneration($prompt);

        return back()->with('success', 'Prompt generation queued again.');
    }

    /**
     * @return array<string, mixed>
     */
    protected function adminPromptData(Prompt $prompt): array
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
            'source_site' => $prompt->source_site,
            'source_slug' => $prompt->source_slug,
            'source_url' => $prompt->source_url,
            'source_thumbnail_url' => $prompt->source_thumbnail_url,
            'category' => $prompt->category,
            'style_notes' => $prompt->style_notes,
            'status' => $prompt->status,
            'copy_count' => $prompt->copy_count,
            'can_regenerate' => $this->canRegeneratePrompt($prompt),
            'error_message' => $prompt->error_message,
            'ai_provider' => $prompt->ai_provider,
            'ai_model' => $prompt->ai_model,
            'edit_url' => route('admin.prompts.edit', $prompt),
            'generated_at' => $prompt->generated_at?->toIso8601String(),
            'created_at' => $prompt->created_at?->toIso8601String(),
            'user' => $prompt->user === null ? null : [
                'id' => $prompt->user->id,
                'name' => $prompt->user->name,
                'email' => $prompt->user->email,
            ],
        ];
    }

    /**
     * @return array{search: string, status: string|null, category: string|null, generation_mode: string|null, source_site: string|null, created_from: string|null, created_to: string|null, generated_from: string|null, generated_to: string|null, sort: string, per_page: int}
     */
    private function filters(Request $request): array
    {
        $status = (string) $request->string('status');
        $category = (string) $request->string('category');
        $generationMode = (string) $request->string('generation_mode');
        $sourceSite = (string) $request->string('source_site');
        $sort = (string) $request->string('sort', self::SORT_NEWEST);
        $perPage = $request->integer('per_page', 24);

        return [
            'search' => trim((string) $request->string('search')),
            'status' => in_array($status, Prompt::STATUSES, true) ? $status : null,
            'category' => in_array($category, Prompt::CATEGORIES, true) ? $category : null,
            'generation_mode' => in_array($generationMode, Prompt::GENERATION_MODES, true) ? $generationMode : null,
            'source_site' => in_array($sourceSite, ['local', 'promptplum'], true) ? $sourceSite : null,
            'created_from' => $this->dateFilter($request->string('created_from')->toString()),
            'created_to' => $this->dateFilter($request->string('created_to')->toString()),
            'generated_from' => $this->dateFilter($request->string('generated_from')->toString()),
            'generated_to' => $this->dateFilter($request->string('generated_to')->toString()),
            'sort' => in_array($sort, self::SORTS, true) ? $sort : self::SORT_NEWEST,
            'per_page' => in_array($perPage, self::PER_PAGE_OPTIONS, true) ? $perPage : 24,
        ];
    }

    /**
     * @param  Builder<Prompt>  $query
     */
    private function applySort(Builder $query, string $sort): void
    {
        match ($sort) {
            self::SORT_OLDEST => $query->oldest(),
            self::SORT_MOST_COPIED => $query->orderByDesc('copy_count')->latest(),
            self::SORT_TITLE => $query->orderBy('title')->latest(),
            self::SORT_STATUS => $query->orderBy('status')->latest(),
            self::SORT_CATEGORY => $query->orderBy('category')->latest(),
            self::SORT_GENERATION_MODE => $query->orderBy('generation_mode')->latest(),
            default => $query->latest(),
        };
    }

    private function canRegeneratePrompt(Prompt $prompt): bool
    {
        if ($prompt->generation_mode === Prompt::GENERATION_MODE_IMPORTED) {
            return false;
        }

        if ($prompt->generation_mode === Prompt::GENERATION_MODE_AUTO) {
            return $prompt->status === Prompt::STATUS_FAILED || $prompt->status === Prompt::STATUS_COMPLETED;
        }

        return is_string($prompt->reference_image_path)
            && $prompt->reference_image_path !== ''
            && Storage::disk('public')->exists($prompt->reference_image_path);
    }

    private function resetAndDispatchRegeneration(Prompt $prompt): void
    {
        $prompt->update([
            'title' => 'Generating prompt',
            'prompt' => null,
            'negative_prompt' => null,
            'thumbnail_prompt' => null,
            'category' => $prompt->generation_mode === Prompt::GENERATION_MODE_AUTO ? $prompt->category : null,
            'style_notes' => null,
            'ai_provider' => null,
            'ai_model' => null,
            'status' => Prompt::STATUS_PENDING,
            'error_message' => null,
            'generated_at' => null,
        ]);

        if ($prompt->generation_mode === Prompt::GENERATION_MODE_AUTO) {
            $this->deleteStoragePath($prompt->thumbnail_path);
            $prompt->forceFill(['thumbnail_path' => null])->save();

            GenerateAutoPromptJob::dispatch($prompt);

            return;
        }

        GeneratePromptFromReferenceImageJob::dispatch($prompt);
    }

    /**
     * @param  Collection<int, Prompt>  $prompts
     */
    private function bulkDelete(Collection $prompts): RedirectResponse
    {
        foreach ($prompts as $prompt) {
            Gate::authorize('delete', $prompt);
            $this->deletePromptAssets($prompt);
            $prompt->delete();
        }

        return back()->with('success', $prompts->count().' prompt'.($prompts->count() === 1 ? '' : 's').' deleted.');
    }

    /**
     * @param  Collection<int, Prompt>  $prompts
     */
    private function bulkStatus(Collection $prompts, string $status): RedirectResponse
    {
        foreach ($prompts as $prompt) {
            Gate::authorize('update', $prompt);
        }

        if ($status === Prompt::STATUS_COMPLETED && $prompts->contains(fn (Prompt $prompt): bool => trim((string) $prompt->prompt) === '')) {
            return back()->withErrors(['bulk' => 'Completed status can only be applied to prompts with prompt text.']);
        }

        Prompt::query()->whereKey($prompts->modelKeys())->update(['status' => $status]);

        return back()->with('success', $prompts->count().' prompt status'.($prompts->count() === 1 ? '' : 'es').' updated.');
    }

    /**
     * @param  Collection<int, Prompt>  $prompts
     */
    private function bulkPublish(Collection $prompts): RedirectResponse
    {
        foreach ($prompts as $prompt) {
            Gate::authorize('update', $prompt);
        }

        if ($prompts->contains(fn (Prompt $prompt): bool => trim((string) $prompt->prompt) === '')) {
            return back()->withErrors(['bulk' => 'Only prompts with prompt text can be published.']);
        }

        Prompt::query()->whereKey($prompts->modelKeys())->update([
            'status' => Prompt::STATUS_COMPLETED,
            'error_message' => null,
        ]);

        return back()->with('success', $prompts->count().' prompt'.($prompts->count() === 1 ? '' : 's').' published.');
    }

    /**
     * @param  Collection<int, Prompt>  $prompts
     */
    private function bulkDraft(Collection $prompts): RedirectResponse
    {
        foreach ($prompts as $prompt) {
            Gate::authorize('update', $prompt);
        }

        Prompt::query()->whereKey($prompts->modelKeys())->update(['status' => Prompt::STATUS_PENDING]);

        return back()->with('success', $prompts->count().' prompt'.($prompts->count() === 1 ? '' : 's').' moved to draft.');
    }

    /**
     * @param  Collection<int, Prompt>  $prompts
     */
    private function bulkCategory(Collection $prompts, string $category): RedirectResponse
    {
        foreach ($prompts as $prompt) {
            Gate::authorize('update', $prompt);
        }

        Prompt::query()->whereKey($prompts->modelKeys())->update(['category' => $category]);

        return back()->with('success', $prompts->count().' prompt categor'.($prompts->count() === 1 ? 'y' : 'ies').' updated.');
    }

    /**
     * @param  Collection<int, Prompt>  $prompts
     */
    private function bulkRetry(Collection $prompts): RedirectResponse
    {
        $queued = 0;

        foreach ($prompts as $prompt) {
            Gate::authorize('regenerate', $prompt);

            if (! $this->canRegeneratePrompt($prompt)) {
                continue;
            }

            $this->resetAndDispatchRegeneration($prompt);
            $queued++;
        }

        $skipped = $prompts->count() - $queued;

        return back()->with('success', "{$queued} prompt".($queued === 1 ? '' : 's')." queued. {$skipped} skipped.");
    }

    private function deletePromptAssets(Prompt $prompt): void
    {
        $this->deleteStoragePath($prompt->reference_image_path);
        $this->deleteStoragePath($prompt->thumbnail_path);
    }

    private function deleteStoragePath(?string $path): void
    {
        if (! is_string($path) || $path === '' || Str::startsWith($path, ['http://', 'https://'])) {
            return;
        }

        Storage::disk('public')->delete($path);
    }

    private function storePromptImage(UploadedFile $file, string $directory): string
    {
        $path = $file->storeAs($directory, (string) Str::uuid().'.'.$file->extension(), 'public');

        if (! is_string($path)) {
            throw new RuntimeException('Unable to store prompt image.');
        }

        return $path;
    }

    /**
     * @param  array<string, string|null>|null  $styleNotes
     * @return array<string, string>|null
     */
    private function styleNotes(?array $styleNotes): ?array
    {
        if ($styleNotes === null) {
            return null;
        }

        /** @var array<string, string> $clean */
        $clean = collect($styleNotes)
            ->map(fn (mixed $value): ?string => $this->nullableText(is_string($value) ? $value : null))
            ->filter(fn (?string $value): bool => $value !== null)
            ->all();

        return $clean === [] ? null : $clean;
    }

    private function nullableText(?string $value): ?string
    {
        $value = is_string($value) ? trim($value) : '';

        return $value === '' ? null : $value;
    }

    private function parseDate(?string $value): ?Carbon
    {
        return $this->nullableText($value) === null ? null : Carbon::parse((string) $value);
    }

    private function dateFilter(?string $value): ?string
    {
        $value = $this->nullableText($value);

        if ($value === null) {
            return null;
        }

        try {
            return Carbon::parse($value)->toDateString();
        } catch (\Throwable) {
            return null;
        }
    }
}
