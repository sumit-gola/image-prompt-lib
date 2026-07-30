<?php

namespace App\Http\Controllers;

use App\Actions\Prompts\BuildPromptStatusSummary;
use App\Actions\Prompts\ResolvePromptLibraryAiConfiguration;
use App\Actions\Prompts\ResolvePromptLibraryImageConfiguration;
use App\Actions\Prompts\StoreAutoPrompt;
use App\Actions\Prompts\StorePromptReferenceImages;
use App\Http\Requests\StoreAutoPromptRequest;
use App\Http\Requests\StorePromptReferenceImagesRequest;
use App\Jobs\GenerateAutoPromptJob;
use App\Jobs\GeneratePromptFromReferenceImageJob;
use App\Models\Prompt;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class AdminPromptController extends Controller
{
    public function index(
        Request $request,
        BuildPromptStatusSummary $buildPromptStatusSummary,
        ResolvePromptLibraryAiConfiguration $aiConfiguration,
        ResolvePromptLibraryImageConfiguration $imageConfiguration,
    ): Response {
        Gate::authorize('create', Prompt::class);

        $search = trim((string) $request->string('search'));
        $status = (string) $request->string('status');
        $status = in_array($status, [
            Prompt::STATUS_PENDING,
            Prompt::STATUS_PROCESSING,
            Prompt::STATUS_COMPLETED,
            Prompt::STATUS_FAILED,
        ], true) ? $status : null;

        $prompts = Prompt::query()
            ->with('user:id,name,email')
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($query) use ($search): void {
                    $query->where('title', 'like', "%{$search}%")
                        ->orWhere('prompt', 'like', "%{$search}%")
                        ->orWhere('source_idea', 'like', "%{$search}%")
                        ->orWhere('thumbnail_prompt', 'like', "%{$search}%")
                        ->orWhere('error_message', 'like', "%{$search}%");
                });
            })
            ->when($status !== null, fn ($query) => $query->where('status', $status))
            ->latest()
            ->paginate(24)
            ->withQueryString()
            ->through(fn (Prompt $prompt): array => $this->adminPromptData($prompt));

        return Inertia::render('admin/prompts/index', [
            'prompts' => $prompts,
            'statuses' => [
                Prompt::STATUS_PENDING,
                Prompt::STATUS_PROCESSING,
                Prompt::STATUS_COMPLETED,
                Prompt::STATUS_FAILED,
            ],
            'filters' => [
                'search' => $search,
                'status' => $status,
            ],
            'summary' => $buildPromptStatusSummary->handle(),
            'aiConfiguration' => $aiConfiguration->handle(),
            'imageAiConfiguration' => $imageConfiguration->handle(),
            'requiresPolling' => Prompt::query()
                ->whereIn('status', [Prompt::STATUS_PENDING, Prompt::STATUS_PROCESSING])
                ->exists(),
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

        $paths = array_values(array_filter([
            $prompt->reference_image_path,
            $prompt->thumbnail_path,
        ], fn (?string $path): bool => is_string($path) && $path !== ''));

        if ($paths !== []) {
            Storage::disk('public')->delete($paths);
        }

        $prompt->delete();

        return back()->with('success', 'Prompt deleted.');
    }

    public function regenerate(Prompt $prompt): RedirectResponse
    {
        Gate::authorize('regenerate', $prompt);

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
            if (is_string($prompt->thumbnail_path) && $prompt->thumbnail_path !== '') {
                Storage::disk('public')->delete($prompt->thumbnail_path);
            }

            $prompt->forceFill(['thumbnail_path' => null])->save();

            GenerateAutoPromptJob::dispatch($prompt);
        } else {
            GeneratePromptFromReferenceImageJob::dispatch($prompt);
        }

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
            'category' => $prompt->category,
            'style_notes' => $prompt->style_notes,
            'status' => $prompt->status,
            'copy_count' => $prompt->copy_count,
            'error_message' => $prompt->error_message,
            'ai_provider' => $prompt->ai_provider,
            'ai_model' => $prompt->ai_model,
            'generated_at' => $prompt->generated_at?->toIso8601String(),
            'created_at' => $prompt->created_at?->toIso8601String(),
            'user' => $prompt->user === null ? null : [
                'id' => $prompt->user->id,
                'name' => $prompt->user->name,
                'email' => $prompt->user->email,
            ],
        ];
    }
}
