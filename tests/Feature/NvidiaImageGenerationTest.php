<?php

use App\Actions\Prompts\GenerateAndStorePromptThumbnail;
use App\Actions\Prompts\ResolvePromptLibraryImageConfiguration;
use App\Jobs\GeneratePromptThumbnailJob;
use App\Models\Prompt;
use App\Models\User;
use App\Services\Nvidia\NvidiaImageGenerator;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

beforeEach(function (): void {
    config([
        'ai.prompt_library.image_provider' => 'nvidia',
        'ai.prompt_library.image_model' => 'black-forest-labs/flux.1-dev',
        'ai.prompt_library.image_timeout' => 180,
        'ai.providers.nvidia.image.key' => 'test-nvidia-key',
        'ai.providers.nvidia.image.url' => 'https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-dev',
        'ai.providers.nvidia.image.model' => 'black-forest-labs/flux.1-dev',
        'ai.providers.nvidia.image.width' => 832,
        'ai.providers.nvidia.image.height' => 1216,
        'ai.providers.nvidia.image.steps' => 50,
        'ai.providers.nvidia.image.cfg_scale' => 5,
        'ai.providers.nvidia.image.prompt_limit' => 10000,
    ]);
});

test('nvidia image provider configuration is resolved', function (): void {
    $configuration = app(ResolvePromptLibraryImageConfiguration::class)->handle();

    expect($configuration)->toMatchArray([
        'provider' => 'nvidia',
        'model' => 'black-forest-labs/flux.1-dev',
        'timeout' => 180,
        'is_configured' => true,
        'credential_env' => 'NVIDIA_API_KEY',
    ]);
});

test('nvidia image provider reports a missing api key', function (): void {
    config(['ai.providers.nvidia.image.key' => null]);

    $configuration = app(ResolvePromptLibraryImageConfiguration::class)->handle();

    expect($configuration)->toMatchArray([
        'is_configured' => false,
        'credential_env' => 'NVIDIA_API_KEY',
    ])->and($configuration['message'])->toContain('NVIDIA_API_KEY');
});

test('nvidia image generation rejects a mismatched official model endpoint', function (): void {
    Http::preventStrayRequests();
    config([
        'ai.providers.nvidia.image.url' => 'https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.2-klein-4b',
    ]);

    expect(fn () => app(NvidiaImageGenerator::class)->generate('A scene', 180))
        ->toThrow(RuntimeException::class, 'model and endpoint do not match');

    Http::assertNothingSent();
});

test('nvidia image generation sends the expected request and decodes image data', function (): void {
    Http::preventStrayRequests();
    Http::fake([
        'ai.api.nvidia.com/*' => Http::response([
            'artifacts' => [['base64' => base64_encode(tinyPng())]],
        ]),
    ]);

    $image = app(NvidiaImageGenerator::class)->generate('A cinematic meadow portrait', 180);

    expect($image->contents)->toBe(tinyPng())
        ->and($image->mimeType)->toBe('image/png');

    Http::assertSent(fn (Request $request): bool => $request->url() === config('ai.providers.nvidia.image.url')
        && $request->hasHeader('Authorization', 'Bearer test-nvidia-key')
        && $request['prompt'] === 'A cinematic meadow portrait'
        && $request['width'] === 832
        && $request['height'] === 1216
        && $request['steps'] === 50
        && $request['cfg_scale'] === 5.0
        && ! isset($request['mode']));
});

test('nvidia image generation downloads a returned image url', function (): void {
    Http::preventStrayRequests();
    Http::fake([
        'ai.api.nvidia.com/*' => Http::response([
            'artifacts' => [['url' => 'https://assets.nvidia.example/generated.png']],
        ]),
        'assets.nvidia.example/*' => Http::response(tinyPng(), headers: ['Content-Type' => 'image/png']),
    ]);

    $image = app(NvidiaImageGenerator::class)->generate('A product photograph', 180);

    expect($image->contents)->toBe(tinyPng());
});

test('malformed nvidia responses fail safely', function (): void {
    Http::preventStrayRequests();
    Http::fake(['ai.api.nvidia.com/*' => Http::response(['artifacts' => []])]);

    expect(fn () => app(NvidiaImageGenerator::class)->generate('A scene', 180))
        ->toThrow(RuntimeException::class, 'returned no image');
});

test('nvidia validation errors identify rejected fields without returning input', function (): void {
    Http::preventStrayRequests();
    Http::fake([
        'ai.api.nvidia.com/*' => Http::response([
            'detail' => [[
                'loc' => ['body', 'prompt'],
                'msg' => 'String should have at most 10000 characters',
                'input' => 'sensitive prompt contents',
            ]],
        ], 422),
    ]);

    expect(fn () => app(NvidiaImageGenerator::class)->generate('A scene', 180))
        ->toThrow(RuntimeException::class, 'prompt: String should have at most 10000 characters');
});

test('generated thumbnails replace the old image only after successful storage', function (): void {
    Storage::fake('public');
    Storage::disk('public')->put('prompts/thumbnails/old.png', 'old-image');
    Http::preventStrayRequests();
    Http::fake([
        'ai.api.nvidia.com/*' => Http::response([
            'artifacts' => [['base64' => base64_encode(tinyPng())]],
        ]),
    ]);

    $prompt = Prompt::factory()->create([
        'prompt' => 'A detailed meadow portrait.',
        'thumbnail_prompt' => 'A golden-hour meadow portrait without text.',
        'thumbnail_path' => 'prompts/thumbnails/old.png',
    ]);

    $path = app(GenerateAndStorePromptThumbnail::class)->handle($prompt);

    expect($path)->toStartWith('prompts/thumbnails/')
        ->and($prompt->refresh()->thumbnail_path)->toBe($path);
    Storage::disk('public')->assertExists($path);
    Storage::disk('public')->assertMissing('prompts/thumbnails/old.png');
});

test('thumbnail generation keeps nvidia prompts within the configured provider limit', function (): void {
    Storage::fake('public');
    Http::preventStrayRequests();
    Http::fake([
        'ai.api.nvidia.com/*' => Http::response([
            'artifacts' => [['base64' => base64_encode(tinyPng())]],
        ]),
    ]);

    config(['ai.providers.nvidia.image.prompt_limit' => 800]);

    $prompt = Prompt::factory()->create([
        'prompt' => str_repeat('Detailed visual direction. ', 60),
    ]);

    app(GenerateAndStorePromptThumbnail::class)->handle($prompt, $prompt->prompt);

    Http::assertSent(fn (Request $request): bool => mb_strlen($request['prompt']) <= 800
        && str_contains($request['prompt'], 'Do not include text'));
});

test('failed generation preserves the existing thumbnail', function (): void {
    Storage::fake('public');
    Storage::disk('public')->put('prompts/thumbnails/old.png', 'old-image');
    Http::preventStrayRequests();
    Http::fake(['ai.api.nvidia.com/*' => Http::response(['message' => 'failure'], 500)]);

    $prompt = Prompt::factory()->create([
        'prompt' => 'A detailed portrait.',
        'thumbnail_path' => 'prompts/thumbnails/old.png',
    ]);

    expect(fn () => app(GenerateAndStorePromptThumbnail::class)->handle($prompt))
        ->toThrow(RuntimeException::class);

    expect($prompt->refresh()->thumbnail_path)->toBe('prompts/thumbnails/old.png');
    Storage::disk('public')->assertExists('prompts/thumbnails/old.png');
});

test('only admins can queue thumbnail generation', function (): void {
    Bus::fake();
    $prompt = Prompt::factory()->create(['prompt' => 'A detailed portrait.']);

    $this->actingAs(User::factory()->create())
        ->post("/admin/prompts/{$prompt->id}/thumbnail")
        ->assertForbidden();

    $this->actingAs(User::factory()->admin()->create())
        ->post("/admin/prompts/{$prompt->id}/thumbnail")
        ->assertRedirect();

    Bus::assertDispatched(GeneratePromptThumbnailJob::class);
});

test('thumbnail generation jobs use the dedicated thumbnail queue', function (): void {
    $job = new GeneratePromptThumbnailJob(Prompt::factory()->create());

    expect($job->queue)->toBe('thumbnails');
});

function tinyPng(): string
{
    return (string) base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', true);
}
