<?php

namespace App\Actions\Prompts;

use App\Models\Prompt;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class ReplacePromptThumbnail
{
    public function handle(Prompt $prompt, UploadedFile $thumbnail): Prompt
    {
        $path = $thumbnail->storeAs(
            'prompts/thumbnails',
            (string) Str::uuid().'.'.$thumbnail->extension(),
            'public',
        );

        if (! is_string($path)) {
            throw new RuntimeException('Unable to store prompt thumbnail.');
        }

        $previousPath = $prompt->thumbnail_path;

        try {
            $prompt->forceFill(['thumbnail_path' => $path])->save();
        } catch (Throwable $exception) {
            Storage::disk('public')->delete($path);

            throw $exception;
        }

        if ($this->isLocalPath($previousPath) && $previousPath !== $path) {
            Storage::disk('public')->delete($previousPath);
        }

        return $prompt->refresh();
    }

    private function isLocalPath(?string $path): bool
    {
        return is_string($path)
            && $path !== ''
            && ! Str::startsWith($path, ['http://', 'https://']);
    }
}
