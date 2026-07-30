<?php

namespace Database\Factories;

use App\Models\Prompt;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Prompt>
 */
class PromptFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'title' => fake()->words(3, true),
            'prompt' => fake()->paragraph(),
            'negative_prompt' => fake()->sentence(),
            'thumbnail_prompt' => fake()->sentence(),
            'thumbnail_path' => 'prompts/thumbnails/'.fake()->uuid().'.jpg',
            'reference_image_path' => 'prompts/references/'.fake()->uuid().'.jpg',
            'generation_mode' => Prompt::GENERATION_MODE_REFERENCE_IMAGE,
            'source_idea' => null,
            'source_site' => null,
            'source_slug' => null,
            'source_url' => null,
            'source_thumbnail_url' => null,
            'source_published_at' => null,
            'source_modified_at' => null,
            'category' => fake()->randomElement(Prompt::CATEGORIES),
            'style_notes' => [
                'subject' => fake()->sentence(),
                'composition' => fake()->sentence(),
                'camera_angle' => fake()->sentence(),
                'lighting' => fake()->sentence(),
                'background' => fake()->sentence(),
                'colors' => fake()->sentence(),
                'mood' => fake()->sentence(),
                'quality' => fake()->sentence(),
                'dynamic_subject_guidance' => fake()->sentence(),
            ],
            'ai_provider' => 'openai',
            'ai_model' => 'gpt-5.4',
            'status' => Prompt::STATUS_COMPLETED,
            'copy_count' => 0,
            'error_message' => null,
            'generated_at' => now(),
        ];
    }

    /**
     * Indicate that the prompt is waiting for AI processing.
     */
    public function pending(): static
    {
        return $this->state(fn (array $attributes) => [
            'title' => 'Generating prompt',
            'prompt' => null,
            'negative_prompt' => null,
            'thumbnail_prompt' => null,
            'category' => null,
            'style_notes' => null,
            'ai_provider' => null,
            'ai_model' => null,
            'status' => Prompt::STATUS_PENDING,
            'error_message' => null,
            'generated_at' => null,
        ]);
    }

    /**
     * Indicate that prompt generation failed.
     */
    public function failed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => Prompt::STATUS_FAILED,
            'error_message' => 'The image could not be analyzed.',
            'generated_at' => null,
        ]);
    }

    /**
     * Indicate that the prompt was generated from an admin creative brief.
     */
    public function auto(): static
    {
        return $this->state(fn (array $attributes) => [
            'generation_mode' => Prompt::GENERATION_MODE_AUTO,
            'source_idea' => 'Idea: '.fake()->sentence(),
            'reference_image_path' => null,
        ]);
    }

    /**
     * Indicate that the prompt was imported from an external prompt library.
     */
    public function imported(): static
    {
        return $this->state(fn (array $attributes) => [
            'generation_mode' => Prompt::GENERATION_MODE_IMPORTED,
            'source_site' => 'promptplum',
            'source_slug' => fake()->unique()->slug(),
            'source_url' => 'https://promptplum.com/prompt/'.fake()->slug().'/',
            'source_thumbnail_url' => 'https://img.promptplum.com/promptImages/'.fake()->uuid().'.webp',
            'source_published_at' => now()->subMonth(),
            'source_modified_at' => now(),
            'reference_image_path' => null,
            'ai_provider' => 'promptplum',
            'ai_model' => 'Gemini',
        ]);
    }
}
