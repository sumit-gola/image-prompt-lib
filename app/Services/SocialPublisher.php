<?php

namespace App\Services;

use App\Models\SocialPost;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class SocialPublisher
{
    /** @return array{id: string, url: string|null} */
    public function publish(SocialPost $post, string $imageUrl, string $promptUrl): array
    {
        return match ($post->platform) {
            'facebook' => $this->facebookPublish($post, $imageUrl),
            'instagram' => $this->instagramPublish($post, $imageUrl),
            'x' => $this->xPublish($post, $promptUrl),
            'pinterest' => $this->pinterestPublish($post, $imageUrl, $promptUrl),
            default => throw new RuntimeException('YouTube static Community publishing is not supported by the YouTube Data API.'),
        };
    }

    /** @return array{id: string, url: string|null} */
    public function update(SocialPost $post): array
    {
        abort_unless(is_string($post->remote_id), 422, 'This post has no remote identifier.');

        return match ($post->platform) {
            'facebook' => $this->facebook()->post($post->remote_id, ['message' => $this->text($post)])->throw()->json() + ['id' => $post->remote_id, 'url' => $post->remote_url],
            'pinterest' => $this->pinterest()->patch('pins/'.$post->remote_id, ['title' => $post->title, 'description' => $this->text($post)])->throw()->json() + ['id' => $post->remote_id, 'url' => $post->remote_url],
            default => throw new RuntimeException('This platform does not support editing this published post. Delete and republish it instead.'),
        };
    }

    public function delete(SocialPost $post): void
    {
        if (! is_string($post->remote_id)) {
            return;
        }

        match ($post->platform) {
            'facebook' => $this->facebook()->delete($post->remote_id)->throw(),
            'x' => $this->x()->delete('tweets/'.$post->remote_id)->throw(),
            'pinterest' => $this->pinterest()->delete('pins/'.$post->remote_id)->throw(),
            default => throw new RuntimeException('Remote deletion is not supported for this platform. Remove it from the platform directly.'),
        };
    }

    /** @return array{id: string, url: string|null} */
    private function facebookPublish(SocialPost $post, string $imageUrl): array
    {
        $data = $this->facebook()->post(config('services.social.facebook.page_id').'/photos', [
            'url' => $imageUrl,
            'caption' => $this->text($post),
            'published' => true,
        ])->throw()->json();
        $id = (string) ($data['post_id'] ?? $data['id'] ?? '');

        return ['id' => $id, 'url' => $id === '' ? null : 'https://www.facebook.com/'.$id];
    }

    /** @return array{id: string, url: string|null} */
    private function instagramPublish(SocialPost $post, string $imageUrl): array
    {
        $account = (string) config('services.social.instagram.user_id');
        $creation = $this->facebook()->post($account.'/media', ['image_url' => $imageUrl, 'caption' => $this->text($post)])->throw()->json('id');
        $id = (string) $this->facebook()->post($account.'/media_publish', ['creation_id' => $creation])->throw()->json('id');

        return ['id' => $id, 'url' => null];
    }

    /** @return array{id: string, url: string|null} */
    private function xPublish(SocialPost $post, string $promptUrl): array
    {
        $data = $this->x()->post('tweets', ['text' => mb_strimwidth($this->text($post).' '.$promptUrl, 0, 280, '…')])->throw()->json('data');
        $id = (string) ($data['id'] ?? '');

        return ['id' => $id, 'url' => $id === '' ? null : 'https://x.com/MyPromptArt/status/'.$id];
    }

    /** @return array{id: string, url: string|null} */
    private function pinterestPublish(SocialPost $post, string $imageUrl, string $promptUrl): array
    {
        $data = $this->pinterest()->post('pins', [
            'board_id' => config('services.social.pinterest.board_id'),
            'title' => $post->title,
            'description' => $this->text($post),
            'link' => $promptUrl,
            'alt_text' => $post->alt_text,
            'media_source' => ['source_type' => 'image_url', 'url' => $imageUrl],
        ])->throw()->json();
        $id = (string) ($data['id'] ?? '');

        return ['id' => $id, 'url' => $id === '' ? null : 'https://www.pinterest.com/pin/'.$id.'/'];
    }

    private function facebook(): PendingRequest
    {
        return Http::baseUrl('https://graph.facebook.com/'.config('services.social.facebook.version', 'v23.0'))->withToken((string) config('services.social.facebook.token'))->retry([500, 1500])->timeout(45);
    }

    private function x(): PendingRequest
    {
        return Http::baseUrl('https://api.x.com/2')->withToken((string) config('services.social.x.token'))->retry([500, 1500])->timeout(45);
    }

    private function pinterest(): PendingRequest
    {
        return Http::baseUrl('https://api.pinterest.com/v5')->withToken((string) config('services.social.pinterest.token'))->retry([500, 1500])->timeout(45);
    }

    private function text(SocialPost $post): string
    {
        $hashtags = collect($post->hashtags)->map(fn (string $tag): string => '#'.ltrim($tag, '#'))->implode(' ');

        return trim($post->caption."\n\n".$hashtags);
    }
}
