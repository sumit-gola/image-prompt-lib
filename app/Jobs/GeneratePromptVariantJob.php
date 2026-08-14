<?php

namespace App\Jobs;

use App\Actions\Prompts\GenerateAndStorePromptThumbnail;
use App\Actions\Prompts\ResolvePromptLibraryAiConfiguration;
use App\Ai\Agents\PromptVariantGeneratorAgent;
use App\Models\Prompt;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Str;
use Laravel\Ai\Responses\StructuredAgentResponse;
use RuntimeException;
use Throwable;

class GeneratePromptVariantJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var list<int> */
    public array $backoff = [10, 60, 180];

    /**
     * Create a new job instance.
     */
    public function __construct(public Prompt $child, public Prompt $parent) {}

    /**
     * Execute the job.
     */
    public function handle(
        ResolvePromptLibraryAiConfiguration $configuration,
        GenerateAndStorePromptThumbnail $generateThumbnail,
    ): void {
        $this->child->update(['status' => Prompt::STATUS_PROCESSING, 'error_message' => null]);

        try {
            $ai = $configuration->handle();

            if (! $ai['is_configured'] || ! is_string($ai['provider'])) {
                throw new RuntimeException($ai['message'] ?? 'AI provider is not configured.');
            }

            $response = (new PromptVariantGeneratorAgent)->prompt(
                $this->agentPrompt(),
                provider: $ai['provider'],
                model: $ai['model'],
                timeout: $ai['timeout'],
            );

            if (! $response instanceof StructuredAgentResponse) {
                throw new RuntimeException('Variant generation returned an unstructured response.');
            }

            $data = $response->toArray();
            $title = $this->requiredString($data['title'] ?? null, 'title');
            $prompt = $this->requiredString($data['prompt'] ?? null, 'prompt');

            if (Str::squish(Str::lower($prompt)) === Str::squish(Str::lower((string) $this->parent->prompt))) {
                throw new RuntimeException('The generated variant is identical to its parent prompt.');
            }

            $variables = $this->child->variation_variables ?? [];
            $variables['generation'] = [
                'change_summary' => $this->stringList($data['change_summary'] ?? null),
                'preserved_elements' => $this->stringList($data['preserved_elements'] ?? null),
                'safety_notes' => $this->stringList($data['safety_notes'] ?? null),
            ];

            $this->child->update([
                'title' => Str::limit($title, 255, ''),
                'prompt' => $prompt,
                'negative_prompt' => $this->nullableString($data['negative_prompt'] ?? null),
                'thumbnail_prompt' => $this->nullableString($data['thumbnail_prompt'] ?? null),
                'variation_variables' => $variables,
                'ai_provider' => $ai['provider'],
                'ai_model' => $ai['model'],
                'generated_at' => now(),
            ]);

            if (($variables['image_option'] ?? null) === 'generate_thumbnail') {
                $generateThumbnail->handle($this->child->refresh());
            }

            $this->child->update(['status' => Prompt::STATUS_PENDING, 'error_message' => null]);
        } catch (Throwable $exception) {
            $this->markFailed($exception);

            throw $exception;
        }
    }

    public function failed(?Throwable $exception): void
    {
        $this->markFailed($exception);
    }

    private function agentPrompt(): string
    {
        $parent = json_encode([
            'title' => $this->parent->title,
            'prompt' => $this->parent->prompt,
            'negative_prompt' => $this->parent->negative_prompt,
            'thumbnail_prompt' => $this->parent->thumbnail_prompt,
            'category' => $this->parent->category,
            'style_notes' => $this->parent->style_notes,
        ], JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR);
        $variation = json_encode($this->child->variation_variables, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR);

        return "PARENT DATA (source of truth):\n{$parent}\n\nSELECTED VARIATION ATTRIBUTES:\n{$variation}\n\nCreate the standalone child prompt. Preserve every listed element and return only the structured result.";
    }

    private function requiredString(mixed $value, string $field): string
    {
        if (! is_string($value) || trim($value) === '') {
            throw new RuntimeException("Variant generation returned an empty {$field}.");
        }

        return trim($value);
    }

    private function nullableString(mixed $value): ?string
    {
        return is_string($value) && trim($value) !== '' ? trim($value) : null;
    }

    /** @return list<string> */
    private function stringList(mixed $value): array
    {
        if (! is_array($value)) {
            throw new RuntimeException('Variant generation metadata is malformed.');
        }

        return collect($value)->filter(fn (mixed $item): bool => is_string($item) && trim($item) !== '')
            ->map(fn (string $item): string => trim($item))->values()->all();
    }

    private function markFailed(?Throwable $exception): void
    {
        $this->child->update([
            'status' => Prompt::STATUS_FAILED,
            'error_message' => $exception?->getMessage() ?: 'Variant generation failed.',
        ]);
    }
}
