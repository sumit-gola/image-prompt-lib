<?php

namespace App\Jobs;

use App\Actions\Prompts\ResolvePromptLibraryAiConfiguration;
use App\Ai\Agents\ReferenceImagePromptAgent;
use App\Models\Prompt;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Laravel\Ai\Files\Image as AiImage;
use Laravel\Ai\Responses\StructuredAgentResponse;
use RuntimeException;
use Throwable;

class GeneratePromptFromReferenceImageJob implements ShouldQueue
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
    public function handle(ResolvePromptLibraryAiConfiguration $aiConfiguration): void
    {
        $this->prompt->update([
            'status' => Prompt::STATUS_PROCESSING,
            'error_message' => null,
        ]);

        try {
            $configuration = $aiConfiguration->handle();

            if (! $configuration['is_configured']) {
                throw new RuntimeException($configuration['message'] ?? 'AI provider is not configured.');
            }

            $provider = $configuration['provider'];
            $model = $configuration['model'];
            $timeout = $configuration['timeout'];

            if (! is_string($this->prompt->reference_image_path) || trim($this->prompt->reference_image_path) === '') {
                throw new RuntimeException('Reference image is missing for this prompt.');
            }

            $response = (new ReferenceImagePromptAgent)->prompt(
                'Create the prompt library entry for this reference image.',
                attachments: [
                    AiImage::fromStorage($this->prompt->reference_image_path, disk: 'public'),
                ],
                provider: $provider,
                model: $model,
                timeout: $timeout,
            );

            if (! $response instanceof StructuredAgentResponse) {
                throw new RuntimeException('Prompt generation returned an unstructured AI response.');
            }

            $data = $response->toArray();

            $this->prompt->update([
                'title' => $this->stringValue($data['title'] ?? null, 'Generated prompt'),
                'prompt' => $this->stringValue($data['prompt'] ?? null),
                'negative_prompt' => $this->nullableStringValue($data['negative_prompt'] ?? null),
                'category' => Prompt::normalizeCategory($data['category'] ?? null),
                'style_notes' => is_array($data['style_notes'] ?? null) ? $data['style_notes'] : null,
                'ai_provider' => $provider,
                'ai_model' => $model,
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
            'error_message' => $exception?->getMessage() ?: 'Prompt generation failed.',
        ]);
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
