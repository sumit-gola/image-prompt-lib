<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Prompts\CreatePromptVariants;
use App\Http\Controllers\Controller;
use App\Http\Requests\StorePromptVariantsRequest;
use App\Jobs\GeneratePromptVariantJob;
use App\Models\Prompt;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;

class PromptVariantController extends Controller
{
    public function store(
        StorePromptVariantsRequest $request,
        Prompt $prompt,
        CreatePromptVariants $createVariants,
    ): RedirectResponse {
        /** @var array{variants: list<array{gender_presentation: string, age_group: string, age_range?: string|null, custom_instruction?: string|null}>, preserve: list<string>, image_option: string} $data */
        $data = $request->validated();
        $summary = $createVariants->handle($prompt, $data['variants'], $data['preserve'], $data['image_option']);

        return back()->with('success', "{$summary['created']} queued, {$summary['skipped']} duplicates skipped, {$summary['rejected']} rejected for safety, {$summary['failed']} failed.");
    }

    public function regenerate(Prompt $prompt, Prompt $variant): RedirectResponse
    {
        Gate::authorize('regenerate', $variant);
        abort_unless($variant->base_prompt_id === $prompt->rootPrompt()->id, 404);

        if (is_string($variant->thumbnail_path)) {
            Storage::disk('public')->delete($variant->thumbnail_path);
        }

        $variant->update([
            'title' => $variant->title,
            'prompt' => null,
            'negative_prompt' => null,
            'thumbnail_prompt' => null,
            'thumbnail_path' => null,
            'ai_provider' => null,
            'ai_model' => null,
            'status' => Prompt::STATUS_PENDING,
            'error_message' => null,
            'generated_at' => null,
        ]);

        GeneratePromptVariantJob::dispatch($variant, $prompt->rootPrompt());

        return back()->with('success', 'Variant regeneration queued.');
    }

    public function destroy(Prompt $prompt, Prompt $variant): RedirectResponse
    {
        Gate::authorize('delete', $variant);
        abort_unless($variant->base_prompt_id === $prompt->rootPrompt()->id, 404);

        foreach ([$variant->thumbnail_path, $variant->reference_image_path] as $path) {
            if (is_string($path)) {
                Storage::disk('public')->delete($path);
            }
        }

        $variant->delete();

        return back()->with('success', 'Variant deleted. The parent and sibling variants were not changed.');
    }
}
