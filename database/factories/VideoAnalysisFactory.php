<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\VideoAnalysis;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<VideoAnalysis>
 */
class VideoAnalysisFactory extends Factory
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
            'original_filename' => 'reference.mp4',
            'video_path' => 'video-analyses/reference.mp4',
            'mime_type' => 'video/mp4',
            'size' => 1024,
            'status' => VideoAnalysis::STATUS_QUEUED,
            'progress' => 0,
            'status_message' => 'Waiting to be processed',
        ];
    }
}
