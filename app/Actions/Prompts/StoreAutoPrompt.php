<?php

namespace App\Actions\Prompts;

use App\Jobs\GenerateAutoPromptJob;
use App\Models\Prompt;
use App\Models\User;

class StoreAutoPrompt
{
    /**
     * @param  array{idea: string, category: string, visual_style?: string|null, subject?: string|null, mood?: string|null, lighting?: string|null, camera_notes?: string|null, target_model_notes?: string|null, negative_notes?: string|null}  $data
     */
    public function handle(User $user, array $data): Prompt
    {
        $prompt = Prompt::query()->create([
            'user_id' => $user->id,
            'title' => 'Generating prompt',
            'generation_mode' => Prompt::GENERATION_MODE_AUTO,
            'source_idea' => $this->sourceIdea($data),
            'category' => Prompt::normalizeCategory($data['category']),
            'thumbnail_path' => null,
            'reference_image_path' => null,
            'status' => Prompt::STATUS_PENDING,
        ]);

        GenerateAutoPromptJob::dispatch($prompt);

        return $prompt;
    }

    /**
     * @param  array{idea: string, category: string, visual_style?: string|null, subject?: string|null, mood?: string|null, lighting?: string|null, camera_notes?: string|null, target_model_notes?: string|null, negative_notes?: string|null}  $data
     */
    private function sourceIdea(array $data): string
    {
        $labels = [
            'idea' => 'Idea',
            'category' => 'Category',
            'visual_style' => 'Visual style',
            'subject' => 'Subject or person',
            'mood' => 'Mood',
            'lighting' => 'Lighting',
            'camera_notes' => 'Camera notes',
            'target_model_notes' => 'Target model notes',
            'negative_notes' => 'Negative notes',
        ];

        return collect($labels)
            ->map(function (string $label, string $key) use ($data): ?string {
                $value = $data[$key] ?? null;

                if (! is_string($value) || trim($value) === '') {
                    return null;
                }

                return "{$label}: ".trim($value);
            })
            ->filter()
            ->implode("\n");
    }
}
