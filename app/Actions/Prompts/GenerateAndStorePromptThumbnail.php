<?php

namespace App\Actions\Prompts;

use App\Models\Prompt;
use App\Services\Nvidia\NvidiaImageGenerator;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Ai\Image;
use RuntimeException;

class GenerateAndStorePromptThumbnail
{
    public function __construct(
        private readonly ResolvePromptLibraryImageConfiguration $imageConfiguration,
        private readonly NvidiaImageGenerator $nvidiaImageGenerator,
    ) {}

    public function handle(Prompt $prompt, ?string $visualDirection = null): string
    {
        $configuration = $this->imageConfiguration->handle();

        if (! $configuration['is_configured'] || ! is_string($configuration['provider'])) {
            throw new RuntimeException($configuration['message'] ?? 'AI image provider is not configured.');
        }

        $direction = $visualDirection === null
            ? $this->visualDirection($prompt)
            : trim($visualDirection);

        if ($direction === '') {
            throw new RuntimeException('Add a prompt before generating an image.');
        }
        $image = $configuration['provider'] === 'nvidia'
            ? $this->nvidiaImageGenerator->generate($this->generationPrompt($direction), $configuration['timeout'])
            : null;

        if ($image !== null) {
            $contents = $image->contents;
            $mimeType = $image->mimeType;
        } else {
            $response = Image::of($this->generationPrompt($direction))
                ->quality('high')
                ->portrait()
                ->timeout($configuration['timeout'])
                ->generate($configuration['provider'], $configuration['model']);

            $generated = $response->firstImage();
            $contents = base64_decode($generated->image, true);
            $mimeType = $generated->mime();

            if (! is_string($contents)) {
                throw new RuntimeException('Unable to decode the generated thumbnail image.');
            }
        }

        $path = 'prompts/thumbnails/'.Str::uuid().'.'.$this->extension($mimeType);

        if (! Storage::disk('public')->put($path, $contents)) {
            throw new RuntimeException('Unable to store the generated thumbnail image.');
        }

        $previousPath = $prompt->thumbnail_path;

        try {
            $prompt->forceFill(['thumbnail_path' => $path])->save();
        } catch (\Throwable $exception) {
            Storage::disk('public')->delete($path);

            throw $exception;
        }

        if (is_string($previousPath) && $previousPath !== $path) {
            Storage::disk('public')->delete($previousPath);
        }

        return $path;
    }

    private function visualDirection(Prompt $prompt): string
    {
        $direction = $prompt->thumbnail_prompt ?: $prompt->prompt;

        if (! is_string($direction) || trim($direction) === '') {
            throw new RuntimeException('Add a thumbnail prompt or main prompt before generating an image.');
        }

        return trim($direction);
    }

    private function generationPrompt(string $direction): string
    {
        $requirements = <<<'PROMPT'


Create a polished portrait-format preview image for an AI prompt library. Preserve the subject, composition, camera perspective, lighting, palette, atmosphere, background, and artistic style described above. Use one clear fictional focal subject, a readable silhouette, balanced negative space, coherent anatomy, clean edges, professional lighting, intentional color grading, and rich detail without clutter. Do not include text, captions, logos, signatures, watermarks, borders, UI, labels, split screens, collages, frames, or before-and-after layouts.
PROMPT;
        $promptLimit = max(1, (int) config('ai.providers.nvidia.image.prompt_limit', 10000));
        $directionLimit = max(1, $promptLimit - Str::length($requirements));

        return Str::substr($direction, 0, $directionLimit).$requirements;
    }

    private function extension(string $mimeType): string
    {
        return match ($mimeType) {
            'image/jpeg' => 'jpg',
            'image/webp' => 'webp',
            default => 'png',
        };
    }
}
