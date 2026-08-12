<?php

namespace App\Actions\Prompts;

use App\Ai\Agents\ReferenceImagePromptAgent;
use Illuminate\Http\UploadedFile;
use Laravel\Ai\Files\Image as AiImage;
use Laravel\Ai\Responses\StructuredAgentResponse;
use RuntimeException;

class GeneratePromptFromUploadedImage
{
    public function __construct(
        private readonly ResolvePromptLibraryAiConfiguration $aiConfiguration,
    ) {}

    /**
     * @return array{title: string, prompt: string, negative_prompt: string|null, category: string, style_notes: array<string, string>}
     */
    public function handle(UploadedFile $image): array
    {
        $configuration = $this->aiConfiguration->handle();

        if (! $configuration['is_configured']) {
            throw new RuntimeException($configuration['message'] ?? 'AI provider is not configured.');
        }

        $response = (new ReferenceImagePromptAgent)->prompt(
            'Analyze this image and create a directly reusable prompt for generating a visually similar image.',
            attachments: [AiImage::fromUpload($image)],
            provider: $configuration['provider'],
            model: $configuration['model'],
            timeout: $configuration['timeout'],
        );

        if (! $response instanceof StructuredAgentResponse) {
            throw new RuntimeException('Prompt generation returned an invalid response.');
        }

        $data = $response->toArray();

        return [
            'title' => $this->stringValue($data['title'] ?? null, 'Generated image prompt'),
            'prompt' => $this->stringValue($data['prompt'] ?? null),
            'negative_prompt' => $this->nullableStringValue($data['negative_prompt'] ?? null),
            'category' => $this->stringValue($data['category'] ?? null, 'other'),
            'style_notes' => collect($data['style_notes'] ?? [])
                ->filter(fn (mixed $value, mixed $key): bool => is_string($key) && is_string($value))
                ->map(fn (string $value): string => trim($value))
                ->all(),
        ];
    }

    private function stringValue(mixed $value, string $fallback = ''): string
    {
        return is_string($value) && trim($value) !== '' ? trim($value) : $fallback;
    }

    private function nullableStringValue(mixed $value): ?string
    {
        return is_string($value) && trim($value) !== '' ? trim($value) : null;
    }
}
