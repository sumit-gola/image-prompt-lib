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
            'thumbnail_path' => 'prompts/thumbnails/'.fake()->uuid().'.jpg',
            'reference_image_path' => 'prompts/references/'.fake()->uuid().'.jpg',
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
            ],
            'ai_provider' => 'openai',
            'ai_model' => 'gpt-5.4',
            'status' => Prompt::STATUS_COMPLETED,
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
}
