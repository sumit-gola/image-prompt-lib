<?php

namespace App\Jobs;

use App\Actions\Prompts\GenerateAndStorePromptThumbnail;
use App\Actions\Prompts\ResolvePromptLibraryAiConfiguration;
use App\Ai\Agents\AutoPromptGeneratorAgent;
use App\Models\Prompt;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
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
        GenerateAndStorePromptThumbnail $generateThumbnail,
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

            if (! is_string($textConfiguration['provider'])) {
                throw new RuntimeException('AI provider is not configured.');
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

            $generateThumbnail->handle($this->prompt->refresh());

            $this->prompt->update([
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

    protected function stringValue(mixed $value, string $fallback = ''): string
    {
        return is_string($value) && trim($value) !== '' ? trim($value) : $fallback;
    }

    protected function nullableStringValue(mixed $value): ?string
    {
        return is_string($value) && trim($value) !== '' ? trim($value) : null;
    }
}
