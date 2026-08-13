<?php

namespace App\Actions\Prompts;

use App\Jobs\GeneratePromptFromReferenceImageJob;
use App\Models\Prompt;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
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

            if (! is_string($referencePath)) {
                throw new RuntimeException('Unable to store the reference image.');
            }

            $prompt = Prompt::query()->create([
                'user_id' => $user->id,
                'title' => 'Generating prompt',
                'generation_mode' => Prompt::GENERATION_MODE_REFERENCE_IMAGE,
                'reference_image_path' => $referencePath,
                'thumbnail_path' => null,
                'status' => Prompt::STATUS_PENDING,
            ]);

            GeneratePromptFromReferenceImageJob::dispatch($prompt);

            return $prompt;
        });
    }
}
