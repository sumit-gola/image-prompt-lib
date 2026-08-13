<?php

namespace App\Jobs;

use App\Actions\Prompts\GenerateAndStorePromptThumbnail;
use App\Models\Prompt;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Throwable;

class GeneratePromptThumbnailJob implements ShouldBeUnique, ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var array<int, int> */
    public array $backoff = [10, 60, 180];

    public int $timeout = 240;

    public int $uniqueFor = 300;

    public function __construct(public Prompt $prompt)
    {
        $this->onQueue('thumbnails');
    }

    public function uniqueId(): string
    {
        return (string) $this->prompt->getKey();
    }

    public function handle(GenerateAndStorePromptThumbnail $generateThumbnail): void
    {
        $prompt = $this->prompt->refresh();

        $generateThumbnail->handle($prompt, $prompt->prompt);

        $this->prompt->forceFill([
            'status' => Prompt::STATUS_COMPLETED,
            'error_message' => null,
            'generated_at' => $this->prompt->generated_at ?? now(),
        ])->save();
    }

    public function failed(?Throwable $exception): void
    {
        $this->prompt->forceFill([
            'status' => Prompt::STATUS_FAILED,
            'error_message' => $exception?->getMessage() ?: 'Thumbnail generation failed.',
        ])->save();
    }
}
