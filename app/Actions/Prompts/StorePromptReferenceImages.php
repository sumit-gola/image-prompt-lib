<?php

namespace App\Actions\Prompts;

use App\Jobs\GeneratePromptFromReferenceImageJob;
use App\Models\Prompt;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

class StorePromptReferenceImages
{
    /**
     * @param  array<int, UploadedFile>  $images
     * @return Collection<int, Prompt>
     */
    public function handle(User $user, array $images): Collection
    {
        return collect($images)->map(function (UploadedFile $image) use ($user): Prompt {
            $uuid = (string) Str::uuid();
            $extension = strtolower($image->extension() ?: 'jpg');
            $referencePath = $image->storeAs('prompts/references', "{$uuid}.{$extension}", 'public');
            $thumbnailPath = "prompts/thumbnails/{$uuid}.jpg";

            if (! is_string($referencePath)) {
                throw new RuntimeException('Unable to store the reference image.');
            }

            $this->createThumbnail($image, $thumbnailPath);

            $prompt = Prompt::query()->create([
                'user_id' => $user->id,
                'title' => 'Generating prompt',
                'generation_mode' => Prompt::GENERATION_MODE_REFERENCE_IMAGE,
                'reference_image_path' => $referencePath,
                'thumbnail_path' => $thumbnailPath,
                'status' => Prompt::STATUS_PENDING,
            ]);

            GeneratePromptFromReferenceImageJob::dispatch($prompt);

            return $prompt;
        });
    }

    protected function createThumbnail(UploadedFile $image, string $thumbnailPath): void
    {
        $sourcePath = $image->getRealPath();

        if ($sourcePath === false || ! extension_loaded('gd')) {
            Storage::disk('public')->put($thumbnailPath, $image->getContent());

            return;
        }

        $source = @imagecreatefromstring((string) file_get_contents($sourcePath));

        if ($source === false) {
            Storage::disk('public')->put($thumbnailPath, $image->getContent());

            return;
        }

        $width = imagesx($source);
        $height = imagesy($source);
        $targetWidth = 512;
        $targetHeight = max(1, (int) round($height * ($targetWidth / max(1, $width))));

        $thumbnail = imagecreatetruecolor($targetWidth, $targetHeight);
        $background = imagecolorallocate($thumbnail, 255, 255, 255);

        if ($background === false) {
            imagedestroy($source);
            imagedestroy($thumbnail);
            Storage::disk('public')->put($thumbnailPath, $image->getContent());

            return;
        }

        imagefill($thumbnail, 0, 0, $background);
        imagecopyresampled($thumbnail, $source, 0, 0, 0, 0, $targetWidth, $targetHeight, $width, $height);

        $temporaryPath = tempnam(sys_get_temp_dir(), 'prompt-thumb-');

        if ($temporaryPath === false || ! imagejpeg($thumbnail, $temporaryPath, 85)) {
            imagedestroy($source);
            imagedestroy($thumbnail);
            Storage::disk('public')->put($thumbnailPath, $image->getContent());

            return;
        }

        Storage::disk('public')->put($thumbnailPath, (string) file_get_contents($temporaryPath));

        @unlink($temporaryPath);
        imagedestroy($source);
        imagedestroy($thumbnail);
    }
}
