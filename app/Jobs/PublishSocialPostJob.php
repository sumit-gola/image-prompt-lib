<?php

namespace App\Jobs;

use App\Actions\Prompts\ResolvePromptLibraryAiConfiguration;
use App\Ai\Agents\SocialPostWriterAgent;
use App\Models\SocialPost;
use App\Services\SocialPublisher;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Storage;
use Laravel\Ai\Responses\StructuredAgentResponse;
use RuntimeException;
use Throwable;

class PublishSocialPostJob implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new job instance.
     */
    public int $tries = 3;

    public array $backoff = [10, 60, 180];

    public function __construct(public SocialPost $socialPost, public bool $publishNow = true) {}

    /**
     * Execute the job.
     */
    public function handle(ResolvePromptLibraryAiConfiguration $configuration, SocialPublisher $publisher): void
    {
        $post = $this->socialPost->loadMissing('prompt');
        $post->update(['status' => 'generating', 'error_message' => null]);

        try {
            $ai = $configuration->handle();
            throw_unless($ai['is_configured'] && is_string($ai['provider']), RuntimeException::class, $ai['message'] ?? 'AI is not configured.');
            $response = (new SocialPostWriterAgent)->prompt($this->agentPrompt(), provider: $ai['provider'], model: $ai['model'], timeout: $ai['timeout']);
            throw_unless($response instanceof StructuredAgentResponse, RuntimeException::class, 'Social copy generation returned an invalid response.');
            $data = $response->toArray();
            $post->update([
                'title' => $data['title'], 'caption' => $data['caption'], 'hashtags' => $data['hashtags'],
                'alt_text' => $data['alt_text'], 'status' => $this->publishNow ? 'publishing' : 'draft',
            ]);

            if (! $this->publishNow || $post->platform === 'youtube') {
                return;
            }

            $imagePath = $post->prompt->thumbnail_path ?: $post->prompt->reference_image_path;
            throw_unless(is_string($imagePath), RuntimeException::class, 'The prompt needs an image before social publishing.');
            $result = $publisher->publish($post->refresh(), url(Storage::disk('public')->url($imagePath)), route('prompts.show', $post->prompt));
            $post->update(['status' => 'published', 'remote_id' => $result['id'], 'remote_url' => $result['url'], 'published_at' => now(), 'last_synced_at' => now()]);
        } catch (Throwable $exception) {
            $post->update(['status' => 'failed', 'error_message' => $exception->getMessage()]);
            throw $exception;
        }
    }

    private function agentPrompt(): string
    {
        return json_encode(['platform' => $this->socialPost->platform, 'brand' => 'MyPromptArt', 'prompt' => $this->socialPost->prompt->only(['title', 'prompt', 'negative_prompt', 'category', 'style_notes']), 'public_url' => route('prompts.show', $this->socialPost->prompt)], JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR);
    }
}
