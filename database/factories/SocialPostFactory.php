<?php

namespace Database\Factories;

use App\Models\Prompt;
use App\Models\SocialPost;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SocialPost>
 */
class SocialPostFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'prompt_id' => Prompt::factory(),
            'user_id' => User::factory(),
            'platform' => fake()->randomElement(SocialPost::PLATFORMS),
            'status' => 'draft',
            'title' => fake()->sentence(5),
            'caption' => fake()->paragraph(),
            'hashtags' => ['MyPromptArt', 'AIPrompts'],
            'alt_text' => fake()->sentence(),
        ];
    }
}
