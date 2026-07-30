<?php

use App\Ai\Agents\ReferenceImagePromptAgent;
use App\Jobs\GeneratePromptFromReferenceImageJob;
use App\Models\Prompt;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

test('guests can browse completed prompts', function (): void {
    $completed = Prompt::factory()->create([
        'title' => 'Soft studio portrait',
        'prompt' => 'Create a soft studio portrait with warm window light.',
        'status' => Prompt::STATUS_COMPLETED,
    ]);

    Prompt::factory()->pending()->create();

    $this->get('/prompts')
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('prompts/index')
            ->has('prompts.data', 1)
            ->where('prompts.data.0.id', $completed->id)
            ->where('prompts.data.0.prompt', 'Create a soft studio portrait with warm window light.'));
});

test('non admins cannot upload prompt references', function (): void {
    Storage::fake('public');

    $user = User::factory()->create();

    $this->actingAs($user)
        ->post('/admin/prompts', [
            'images' => [
                UploadedFile::fake()->image('reference.jpg')->size(200),
            ],
        ])
        ->assertForbidden();
});

test('admins can upload prompt references', function (): void {
    Bus::fake();
    Storage::fake('public');

    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->post('/admin/prompts', [
            'images' => [
                UploadedFile::fake()->image('reference.jpg', 640, 480)->size(200),
            ],
        ])
        ->assertRedirect('/admin/prompts');

    $prompt = Prompt::query()->firstOrFail();

    expect($prompt)
        ->user_id->toBe($admin->id)
        ->status->toBe(Prompt::STATUS_PENDING)
        ->title->toBe('Generating prompt');

    Storage::disk('public')->assertExists($prompt->reference_image_path);
    Storage::disk('public')->assertExists($prompt->thumbnail_path);

    Bus::assertDispatched(
        GeneratePromptFromReferenceImageJob::class,
        fn (GeneratePromptFromReferenceImageJob $job): bool => $job->prompt->is($prompt),
    );
});

test('invalid prompt reference uploads are rejected', function (): void {
    Bus::fake();
    Storage::fake('public');

    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->from('/admin/prompts')
        ->post('/admin/prompts', [
            'images' => [
                UploadedFile::fake()->create('reference.txt', 10, 'text/plain'),
            ],
        ])
        ->assertRedirect('/admin/prompts')
        ->assertSessionHasErrors('images.0');

    expect(Prompt::query()->count())->toBe(0);
    Bus::assertNotDispatched(GeneratePromptFromReferenceImageJob::class);
});

test('the prompt generation job stores structured ai output', function (): void {
    Storage::fake('public');

    Storage::disk('public')->put('prompts/references/reference.jpg', 'fake-image');

    $prompt = Prompt::factory()->pending()->create([
        'reference_image_path' => 'prompts/references/reference.jpg',
        'thumbnail_path' => 'prompts/thumbnails/reference.jpg',
    ]);

    ReferenceImagePromptAgent::fake([
        [
            'title' => 'Cinematic product table',
            'prompt' => 'Create a cinematic product table scene with low side light and deep shadows.',
            'negative_prompt' => 'blurry, flat lighting, clutter',
            'category' => Prompt::CATEGORY_PRODUCT,
            'style_notes' => [
                'subject' => 'A featured product on a tabletop.',
                'composition' => 'Centered product with negative space.',
                'camera_angle' => 'Low three-quarter angle.',
                'lighting' => 'Directional side light.',
                'background' => 'Dark textured backdrop.',
                'colors' => 'Black, brass, and warm highlights.',
                'mood' => 'Premium and cinematic.',
                'quality' => 'High-detail commercial photography.',
            ],
        ],
    ])->preventStrayPrompts();

    (new GeneratePromptFromReferenceImageJob($prompt))->handle();

    $prompt->refresh();

    expect($prompt)
        ->status->toBe(Prompt::STATUS_COMPLETED)
        ->title->toBe('Cinematic product table')
        ->prompt->toContain('cinematic product table')
        ->negative_prompt->toBe('blurry, flat lighting, clutter')
        ->category->toBe(Prompt::CATEGORY_PRODUCT)
        ->generated_at->not->toBeNull();

    expect($prompt->style_notes)
        ->toHaveKey('lighting', 'Directional side light.');

    ReferenceImagePromptAgent::assertPrompted(
        fn ($prompt): bool => $prompt->contains('Create the prompt library entry'),
    );
});

test('the prompt generation job marks failed ai calls', function (): void {
    Storage::fake('public');

    Storage::disk('public')->put('prompts/references/reference.jpg', 'fake-image');

    $prompt = Prompt::factory()->pending()->create([
        'reference_image_path' => 'prompts/references/reference.jpg',
        'thumbnail_path' => 'prompts/thumbnails/reference.jpg',
    ]);

    ReferenceImagePromptAgent::fake(function (): never {
        throw new RuntimeException('vision model unavailable');
    })->preventStrayPrompts();

    expect(fn () => (new GeneratePromptFromReferenceImageJob($prompt))->handle())
        ->toThrow(RuntimeException::class, 'vision model unavailable');

    $prompt->refresh();

    expect($prompt)
        ->status->toBe(Prompt::STATUS_FAILED)
        ->error_message->toBe('vision model unavailable');
});

test('completed prompt detail exposes copyable prompt text', function (): void {
    $prompt = Prompt::factory()->create([
        'prompt' => 'Create a detailed fashion editorial image.',
        'status' => Prompt::STATUS_COMPLETED,
    ]);

    $this->get("/prompts/{$prompt->id}")
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('prompts/show')
            ->where('promptItem.id', $prompt->id)
            ->where('promptItem.prompt', 'Create a detailed fashion editorial image.'));
});

test('incomplete prompts are hidden from public detail routes', function (): void {
    $prompt = Prompt::factory()->pending()->create();

    $this->get("/prompts/{$prompt->id}")
        ->assertNotFound();
});
