<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSocialPostRequest;
use App\Http\Requests\UpdateSocialPostRequest;
use App\Jobs\PublishSocialPostJob;
use App\Models\Prompt;
use App\Models\SocialPost;
use App\Services\SocialPublisher;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class SocialPostController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('create', Prompt::class);
        $posts = SocialPost::query()->with('prompt:id,title,thumbnail_path,reference_image_path')->latest()->paginate(20)->through(fn (SocialPost $post): array => $this->data($post));

        return Inertia::render('admin/social-posts/index', [
            'posts' => $posts,
            'prompts' => Prompt::query()->completed()->latest()->limit(100)->get(['id', 'title'])->map->only(['id', 'title']),
            'accounts' => collect(config('services.social'))->map(fn (array $account, string $platform): array => ['platform' => $platform, 'url' => $account['url'], 'configured' => $this->configured($platform), 'supports_publish' => $platform !== 'youtube', 'supports_update' => in_array($platform, ['facebook', 'pinterest'], true), 'supports_delete' => in_array($platform, ['facebook', 'x', 'pinterest'], true)])->values(),
        ]);
    }

    public function store(StoreSocialPostRequest $request): RedirectResponse
    {
        $data = $request->validated();
        foreach ($data['platforms'] as $platform) {
            $post = SocialPost::query()->updateOrCreate(['prompt_id' => $data['prompt_id'], 'platform' => $platform], ['user_id' => $request->user()->id, 'status' => 'queued', 'error_message' => null]);
            PublishSocialPostJob::dispatch($post, (bool) $data['publish_now']);
        }

        return back()->with('success', count($data['platforms']).' social post job(s) queued.');
    }

    public function update(UpdateSocialPostRequest $request, SocialPost $socialPost, SocialPublisher $publisher): RedirectResponse
    {
        $data = $request->validated();
        $socialPost->update(collect($data)->except('sync_remote')->all());
        if ($data['sync_remote'] && $socialPost->status === 'published') {
            try {
                $publisher->update($socialPost->refresh());
                $socialPost->update(['last_synced_at' => now(), 'error_message' => null]);
            } catch (Throwable $exception) {
                return back()->withErrors(['social' => $exception->getMessage()]);
            }
        }

        return back()->with('success', 'Social post updated.');
    }

    public function retry(SocialPost $socialPost): RedirectResponse
    {
        Gate::authorize('create', Prompt::class);
        PublishSocialPostJob::dispatch($socialPost, true);

        return back()->with('success', 'Social post queued again.');
    }

    public function destroy(SocialPost $socialPost, SocialPublisher $publisher): RedirectResponse
    {
        Gate::authorize('create', Prompt::class);
        try {
            if (in_array($socialPost->platform, ['facebook', 'x', 'pinterest'], true)) {
                $publisher->delete($socialPost);
            }
            $socialPost->delete();
        } catch (Throwable $exception) {
            return back()->withErrors(['social' => $exception->getMessage()]);
        }

        return back()->with('success', 'Social post deleted.');
    }

    private function configured(string $platform): bool
    {
        return match ($platform) {
            'facebook' => filled(config('services.social.facebook.page_id')) && filled(config('services.social.facebook.token')),
            'instagram' => filled(config('services.social.instagram.user_id')) && filled(config('services.social.facebook.token')),
            'x' => filled(config('services.social.x.token')),
            'pinterest' => filled(config('services.social.pinterest.board_id')) && filled(config('services.social.pinterest.token')),
            default => false,
        };
    }

    private function data(SocialPost $post): array
    {
        return ['id' => $post->id, 'platform' => $post->platform, 'status' => $post->status, 'title' => $post->title, 'caption' => $post->caption, 'hashtags' => $post->hashtags ?? [], 'alt_text' => $post->alt_text, 'remote_url' => $post->remote_url, 'error_message' => $post->error_message, 'published_at' => $post->published_at?->toIso8601String(), 'updated_at' => $post->updated_at?->toIso8601String(), 'prompt' => ['id' => $post->prompt->id, 'title' => $post->prompt->title]];
    }
}
