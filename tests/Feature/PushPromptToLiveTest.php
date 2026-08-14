<?php

use App\Models\Prompt;
use App\Models\User;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

test('an admin can push a prompt with its thumbnail image to the live API', function (): void {
    Storage::fake('public');
    Storage::disk('public')->put('prompts/thumbnails/live.webp', 'thumbnail contents');
    config()->set('services.prompt_live', [
        'url' => 'http://127.0.0.1:8081',
        'user_id' => 77,
        'timeout' => 30,
    ]);
    Http::preventStrayRequests();
    Http::fake([
        'http://127.0.0.1:8081/api/prompts/full' => Http::response(['id' => 501], 201),
    ]);

    $admin = User::factory()->create(['is_admin' => true]);
    $prompt = Prompt::factory()->create([
        'title' => 'Reusable portrait template',
        'category' => Prompt::CATEGORY_PORTRAIT,
        'prompt' => 'Create a cinematic studio portrait',
        'negative_prompt' => 'blur, artifacts',
        'thumbnail_prompt' => 'Studio portrait thumbnail',
        'thumbnail_path' => 'prompts/thumbnails/live.webp',
        'style_notes' => ['lighting' => 'soft', 'lens' => '85mm'],
        'status' => Prompt::STATUS_COMPLETED,
    ]);

    $this->actingAs($admin)
        ->post(route('admin.prompts.push-live', $prompt))
        ->assertRedirect()
        ->assertSessionHas('success', 'Prompt pushed to the live library.');

    Http::assertSent(function (Request $request) use ($prompt): bool {
        $fields = collect($request->data())
            ->filter(fn (array $part): bool => isset($part['name']) && ! isset($part['filename']))
            ->mapWithKeys(fn (array $part): array => [$part['name'] => $part['contents']]);

        return $request->url() === 'http://127.0.0.1:8081/api/prompts/full'
            && ! $request->hasHeader('Authorization')
            && $fields->get('prompt_id') === $prompt->prompt_id
            && (string) $fields->get('user_id') === '77'
            && $fields->get('title') === 'Reusable portrait template'
            && $fields->get('category') === Prompt::CATEGORY_PORTRAIT
            && $fields->get('prompt') === 'Create a cinematic studio portrait'
            && $fields->get('negative_prompt') === 'blur, artifacts'
            && $fields->get('image_rights_status') === 'verified'
            && $fields->get('image_rights_basis') === 'Published by an authenticated administrator from the source prompt library.'
            && $fields->get('image_rights_evidence') === "Source prompt ID: {$prompt->prompt_id}"
            && is_string($fields->get('image_rights_verified_at'))
            && $fields->get('status') === 'completed'
            && is_string($fields->get('reviewed_at'))
            && $fields->get('is_template') === 'true'
            && $fields->get('variation_preset') === Prompt::CATEGORY_PORTRAIT
            && $fields->get('variation_variables') === '{"lighting":"soft","lens":"85mm"}'
            && $request->hasFile('thumbnail', filename: 'live.webp')
            && ! $request->hasFile('reference_image');
    });
});

test('a non-admin cannot push a prompt live', function (): void {
    Http::preventStrayRequests();

    $user = User::factory()->create(['is_admin' => false]);
    $prompt = Prompt::factory()->create();

    $this->actingAs($user)
        ->post(route('admin.prompts.push-live', $prompt))
        ->assertForbidden();

    Http::assertNothingSent();
});

test('the live API request does not send authorization', function (): void {
    Storage::fake('public');
    Storage::disk('public')->put('prompts/thumbnails/live.webp', 'thumbnail contents');
    config()->set('services.prompt_live', [
        'url' => 'http://127.0.0.1:8081',
        'user_id' => null,
        'timeout' => 30,
    ]);
    Http::preventStrayRequests();
    Http::fake([
        'http://127.0.0.1:8081/api/prompts/full' => Http::response(['id' => 501], 201),
    ]);

    $admin = User::factory()->create(['is_admin' => true]);
    $prompt = Prompt::factory()->create([
        'thumbnail_path' => 'prompts/thumbnails/live.webp',
    ]);

    $this->actingAs($admin)
        ->post(route('admin.prompts.push-live', $prompt))
        ->assertRedirect()
        ->assertSessionHas('success', 'Prompt pushed to the live library.');

    Http::assertSent(fn (Request $request): bool => ! $request->hasHeader('Authorization'));
});

test('pushing live requires configuration and a local thumbnail', function (): void {
    Http::preventStrayRequests();
    config()->set('services.prompt_live.url', '');

    $admin = User::factory()->create(['is_admin' => true]);
    $prompt = Prompt::factory()->create(['thumbnail_path' => null]);

    $this->actingAs($admin)
        ->post(route('admin.prompts.push-live', $prompt))
        ->assertRedirect()
        ->assertSessionHasErrors([
            'push_live' => 'Configure PROMPT_LIVE_URL before pushing prompts live.',
        ]);

    Http::assertNothingSent();
});
