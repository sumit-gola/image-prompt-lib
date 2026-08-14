<?php

namespace App\Actions\Prompts;

use App\Models\Prompt;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

class PushPromptToLive
{
    public function handle(Prompt $prompt): Response
    {
        $baseUrl = rtrim((string) config('services.prompt_live.url'), '/');
        $thumbnailPath = $prompt->thumbnail_path;

        if ($baseUrl === '') {
            throw new RuntimeException('Configure PROMPT_LIVE_URL before pushing prompts live.');
        }

        if (! is_string($thumbnailPath) || ! Storage::disk('public')->exists($thumbnailPath)) {
            throw new RuntimeException('A locally stored thumbnail is required before pushing this prompt live.');
        }

        $stream = Storage::disk('public')->readStream($thumbnailPath);

        if (! is_resource($stream)) {
            throw new RuntimeException('Unable to read the prompt thumbnail.');
        }

        try {
            return Http::acceptJson()
                ->connectTimeout(5)
                ->timeout((int) config('services.prompt_live.timeout', 30))
                ->attach('thumbnail', $stream, basename($thumbnailPath))
                ->post("{$baseUrl}/api/prompts/full", $this->payload($prompt))
                ->throw();
        } finally {
            fclose($stream);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(Prompt $prompt): array
    {
        return array_filter([
            'prompt_id' => $prompt->prompt_id,
            'user_id' => config('services.prompt_live.user_id'),
            'title' => $prompt->title,
            'category' => $prompt->category,
            'prompt' => $prompt->prompt,
            'negative_prompt' => $prompt->negative_prompt,
            'thumbnail_prompt' => $prompt->thumbnail_prompt,
            'image_rights_status' => 'verified',
            'image_rights_basis' => 'Published by an authenticated administrator from the source prompt library.',
            'image_rights_evidence' => "Source prompt ID: {$prompt->prompt_id}",
            'image_rights_verified_at' => now()->toAtomString(),
            'status' => $prompt->status === Prompt::STATUS_COMPLETED ? 'completed' : 'draft',
            'reviewed_at' => $prompt->status === Prompt::STATUS_COMPLETED
                ? ($prompt->reviewed_at?->toAtomString() ?? now()->toAtomString())
                : null,
            'is_template' => 'true',
            'variation_preset' => $prompt->category,
            'variation_variables' => $prompt->style_notes === null
                ? null
                : json_encode($prompt->style_notes, JSON_THROW_ON_ERROR),
        ], fn (mixed $value): bool => $value !== null && $value !== '');
    }
}
