<?php

namespace App\Jobs;

use App\Actions\Prompts\ResolvePromptLibraryAiConfiguration;
use App\Actions\Prompts\ResolvePromptLibraryImageConfiguration;
use App\Ai\Agents\AutoPromptGeneratorAgent;
use App\Models\Prompt;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Str;
use Laravel\Ai\Image;
use Laravel\Ai\Responses\StructuredAgentResponse;
use RuntimeException;
use Throwable;

class GenerateAutoPromptJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /**
     * @var array<int, int>
     */
    public array $backoff = [10, 60, 180];

    /**
     * Create a new job instance.
     */
    public function __construct(public Prompt $prompt) {}

    /**
     * Execute the job.
     *
     * @throws Throwable
     */
    public function handle(
        ResolvePromptLibraryAiConfiguration $aiConfiguration,
        ResolvePromptLibraryImageConfiguration $imageConfiguration,
    ): void {
        $this->prompt->update([
            'status' => Prompt::STATUS_PROCESSING,
            'error_message' => null,
        ]);

        try {
            $textConfiguration = $aiConfiguration->handle();

            if (! $textConfiguration['is_configured']) {
                throw new RuntimeException($textConfiguration['message'] ?? 'AI provider is not configured.');
            }

            $imageProviderConfiguration = $imageConfiguration->handle();

            if (! $imageProviderConfiguration['is_configured']) {
                throw new RuntimeException($imageProviderConfiguration['message'] ?? 'AI image provider is not configured.');
            }

            if (! is_string($textConfiguration['provider'])) {
                throw new RuntimeException('AI provider is not configured.');
            }

            if (! is_string($imageProviderConfiguration['provider'])) {
                throw new RuntimeException('AI image provider is not configured.');
            }

            $response = (new AutoPromptGeneratorAgent)->prompt(
                $this->agentPrompt(),
                provider: $textConfiguration['provider'],
                model: $textConfiguration['model'],
                timeout: $textConfiguration['timeout'],
            );

            if (! $response instanceof StructuredAgentResponse) {
                throw new RuntimeException('Auto prompt generation returned an unstructured AI response.');
            }

            $data = $response->toArray();
            $generatedPrompt = $this->stringValue($data['prompt'] ?? null);
            $thumbnailPrompt = $this->stringValue($data['thumbnail_prompt'] ?? null, $generatedPrompt);

            $this->prompt->update([
                'title' => $this->stringValue($data['title'] ?? null, 'Generated prompt'),
                'prompt' => $generatedPrompt,
                'negative_prompt' => $this->nullableStringValue($data['negative_prompt'] ?? null),
                'category' => Prompt::normalizeCategory($data['category'] ?? $this->prompt->category),
                'thumbnail_prompt' => $thumbnailPrompt,
                'style_notes' => is_array($data['style_notes'] ?? null) ? $data['style_notes'] : null,
                'ai_provider' => $textConfiguration['provider'],
                'ai_model' => $textConfiguration['model'],
            ]);

            $thumbnailPath = $this->generateThumbnail(
                $thumbnailPrompt,
                $imageProviderConfiguration['provider'],
                $imageProviderConfiguration['model'],
                $imageProviderConfiguration['timeout'],
            );

            $this->prompt->update([
                'thumbnail_path' => $thumbnailPath,
                'status' => Prompt::STATUS_COMPLETED,
                'error_message' => null,
                'generated_at' => now(),
            ]);
        } catch (Throwable $exception) {
            $this->markFailed($exception);

            throw $exception;
        }
    }

    public function failed(?Throwable $exception): void
    {
        $this->markFailed($exception);
    }

    protected function markFailed(?Throwable $exception): void
    {
        $this->prompt->update([
            'status' => Prompt::STATUS_FAILED,
            'error_message' => $exception?->getMessage() ?: 'Auto prompt generation failed.',
        ]);
    }

    protected function agentPrompt(): string
    {
        $brief = is_string($this->prompt->source_idea) && trim($this->prompt->source_idea) !== ''
            ? trim($this->prompt->source_idea)
            : 'Idea: Create a useful prompt library entry.';

        return <<<PROMPT
Create an auto generated prompt library entry from this creative brief.

{$brief}

Return a complete prompt, negative prompt, category, style notes, and thumbnail prompt.
PROMPT;
    }

    protected function generateThumbnail(string $thumbnailPrompt, string $provider, ?string $model, int $timeout): string
    {
        $response = Image::of($thumbnailPrompt)
            ->quality('high')
            ->portrait()
            ->timeout($timeout)
            ->generate($provider, $model);

        $storedPath = $response->storePubliclyAs('prompts/thumbnails', $this->thumbnailFilename($response->firstImage()->mime()), 'public');

        if (! is_string($storedPath)) {
            throw new RuntimeException('Unable to store the generated thumbnail image.');
        }

        return $storedPath;
    }

    protected function thumbnailFilename(string $mime): string
    {
        $extension = match ($mime) {
            'image/jpeg' => 'jpg',
            'image/webp' => 'webp',
            default => 'png',
        };

        return Str::uuid().".{$extension}";
    }

    protected function stringValue(mixed $value, string $fallback = ''): string
    {
        return is_string($value) && trim($value) !== '' ? trim($value) : $fallback;
    }

    protected function nullableStringValue(mixed $value): ?string
    {
        return is_string($value) && trim($value) !== '' ? trim($value) : null;
    }
}
