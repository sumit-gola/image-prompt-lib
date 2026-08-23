<?php

use App\Jobs\PublishSocialPostJob;
use App\Models\Prompt;
use App\Models\SocialPost;
use App\Models\User;
use App\Services\SocialPublisher;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;

test('administrators can queue platform-specific social posts', function (): void {
    Queue::fake();
    $admin = User::factory()->create(['is_admin' => true]);
    $prompt = Prompt::factory()->create(['status' => Prompt::STATUS_COMPLETED]);

    $this->actingAs($admin)->post(route('admin.social-posts.store'), [
        'prompt_id' => $prompt->id,
        'platforms' => ['facebook', 'instagram', 'x', 'pinterest'],
        'publish_now' => true,
    ])->assertRedirect()->assertSessionHas('success');

    expect(SocialPost::query()->count())->toBe(4);
    Queue::assertPushed(PublishSocialPostJob::class, 4);
});

test('non administrators cannot access social publishing', function (): void {
    $user = User::factory()->create(['is_admin' => false]);

    $this->actingAs($user)->get(route('admin.social-posts.index'))->assertForbidden();
    $this->actingAs($user)->post(route('admin.social-posts.store'), [])->assertForbidden();
});

test('social account urls and platform capabilities are exposed to administrators', function (): void {
    $admin = User::factory()->create(['is_admin' => true]);

    $this->actingAs($admin)->get(route('admin.social-posts.index'))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('admin/social-posts/index')
            ->has('accounts', 5)
            ->where('accounts.0.url', 'https://www.facebook.com/MyPromptArt'));
});

test('facebook publishing sends generated copy and image to the configured page', function (): void {
    config(['services.social.facebook.page_id' => 'page-123', 'services.social.facebook.token' => 'secret-token']);
    Http::fake(['graph.facebook.com/*' => Http::response(['post_id' => 'page-123_456'])]);
    $post = SocialPost::factory()->create(['platform' => 'facebook', 'caption' => 'A human-written caption.', 'hashtags' => ['MyPromptArt']]);

    $result = app(SocialPublisher::class)->publish($post, 'https://mypromptart.com/image.jpg', 'https://mypromptart.com/prompts/1');

    expect($result['id'])->toBe('page-123_456');
    Http::assertSent(fn (Request $request): bool => $request->url() === 'https://graph.facebook.com/v23.0/page-123/photos'
        && $request['url'] === 'https://mypromptart.com/image.jpg'
        && str_contains($request['caption'], '#MyPromptArt'));
});
