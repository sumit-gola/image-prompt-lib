<?php

use App\Ai\Agents\ReferenceImagePromptAgent;
use App\Jobs\GeneratePromptFromReferenceImageJob;
use App\Models\Prompt;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

test('homepage shows only completed prompts', function (): void {
    $completed = Prompt::factory()->create([
        'title' => 'Editorial studio portrait',
        'prompt' => 'Create a refined editorial studio portrait with crisp rim lighting.',
        'status' => Prompt::STATUS_COMPLETED,
    ]);

    Prompt::factory()->pending()->create([
        'title' => 'Hidden pending prompt',
    ]);

    $this->get('/')
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('prompts/index')
            ->has('prompts.data', 1)
            ->where('prompts.data.0.id', $completed->id)
            ->where('prompts.data.0.title', 'Editorial studio portrait'));
});

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

test('search filters prompts by title prompt text and category', function (): void {
    $matchingTitle = Prompt::factory()->create([
        'title' => 'Chrome perfume bottle',
        'prompt' => 'Minimal table top product photograph.',
        'category' => Prompt::CATEGORY_PRODUCT,
    ]);
    $matchingPrompt = Prompt::factory()->create([
        'title' => 'Window seat portrait',
        'prompt' => 'A cinematic denim editorial with rain on the glass.',
        'category' => Prompt::CATEGORY_FASHION,
    ]);
    $matchingCategory = Prompt::factory()->create([
        'title' => 'Clean catalog image',
        'prompt' => 'White cyclorama product frame.',
        'category' => Prompt::CATEGORY_ART,
    ]);
    Prompt::factory()->create([
        'title' => 'Unrelated scene',
        'prompt' => 'A quiet room with soft light.',
        'category' => Prompt::CATEGORY_LIFESTYLE,
    ]);

    $titleResults = $this->get('/?search=perfume')->inertiaProps('prompts.data');
    $promptResults = $this->get('/?search=denim')->inertiaProps('prompts.data');
    $categoryResults = $this->get('/?search=art')->inertiaProps('prompts.data');

    expect(collect($titleResults)->pluck('id')->all())->toBe([$matchingTitle->id])
        ->and(collect($promptResults)->pluck('id')->all())->toBe([$matchingPrompt->id])
        ->and(collect($categoryResults)->pluck('id')->all())->toBe([$matchingCategory->id]);
});

test('category filter works', function (): void {
    $fashion = Prompt::factory()->create([
        'category' => Prompt::CATEGORY_FASHION,
    ]);

    Prompt::factory()->create([
        'category' => Prompt::CATEGORY_PRODUCT,
    ]);

    $this->get('/?category=fashion')
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->where('filters.category', Prompt::CATEGORY_FASHION)
            ->has('prompts.data', 1)
            ->where('prompts.data.0.id', $fashion->id));
});

test('homepage includes library counts and suggested prompts for empty filters', function (): void {
    $portrait = Prompt::factory()->create([
        'category' => Prompt::CATEGORY_PORTRAIT,
        'copy_count' => 3,
        'generated_at' => now()->subDay(),
    ]);
    $fashion = Prompt::factory()->create([
        'category' => Prompt::CATEGORY_FASHION,
        'copy_count' => 7,
        'generated_at' => now(),
    ]);
    Prompt::factory()->pending()->create([
        'category' => Prompt::CATEGORY_OTHER,
    ]);

    $response = $this->get('/?category=other')
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->where('totalCompleted', 2)
            ->where('totalCopies', 10)
            ->where('newestCategory', Prompt::CATEGORY_FASHION)
            ->where('categoryCounts.portrait', 1)
            ->where('categoryCounts.fashion', 1)
            ->where('categoryCounts.other', 0)
            ->where('prompts.total', 0)
            ->has('suggestedPrompts', 2)
            ->has('trendingSearches', 2)
            ->has('collections', 2)
            ->where('modelCounts.0.model', 'gpt-5.4')
            ->where('modelCounts.0.label', 'Gpt 5.4')
            ->where('modelCounts.0.count', 2));

    expect(collect($response->inertiaProps('suggestedPrompts'))->pluck('id')->all())
        ->toEqualCanonicalizing([$portrait->id, $fashion->id]);
});

test('sort by newest works', function (): void {
    $old = Prompt::factory()->create([
        'generated_at' => now()->subDays(3),
    ]);
    $new = Prompt::factory()->create([
        'generated_at' => now()->subHour(),
    ]);

    $results = $this->get('/?sort=newest')->inertiaProps('prompts.data');

    expect(collect($results)->pluck('id')->all())->toBe([$new->id, $old->id]);
});

test('sort by popular works', function (): void {
    $leastPopular = Prompt::factory()->create([
        'copy_count' => 2,
        'generated_at' => now(),
    ]);
    $mostPopular = Prompt::factory()->create([
        'copy_count' => 18,
        'generated_at' => now()->subDay(),
    ]);

    $results = $this->get('/?sort=popular')->inertiaProps('prompts.data');

    expect(collect($results)->pluck('id')->all())->toBe([$mostPopular->id, $leastPopular->id]);
});

test('sort by most copied works', function (): void {
    $leastCopied = Prompt::factory()->create([
        'copy_count' => 2,
    ]);
    $mostCopied = Prompt::factory()->create([
        'copy_count' => 18,
    ]);

    $results = $this->get('/?sort=most_copied')->inertiaProps('prompts.data');

    expect(collect($results)->pluck('id')->all())->toBe([$mostCopied->id, $leastCopied->id]);
});

test('sort by category works', function (): void {
    $fashion = Prompt::factory()->create([
        'category' => Prompt::CATEGORY_FASHION,
        'generated_at' => now(),
    ]);
    $art = Prompt::factory()->create([
        'category' => Prompt::CATEGORY_ART,
        'generated_at' => now()->subDay(),
    ]);

    $results = $this->get('/?sort=category')->inertiaProps('prompts.data');

    expect(collect($results)->pluck('id')->all())->toBe([$art->id, $fashion->id]);
});

test('copy endpoint increments copy count', function (): void {
    $prompt = Prompt::factory()->create([
        'copy_count' => 4,
        'status' => Prompt::STATUS_COMPLETED,
    ]);

    $this->postJson("/prompts/{$prompt->id}/copy")
        ->assertSuccessful()
        ->assertJson([
            'copy_count' => 5,
        ]);

    expect($prompt->refresh()->copy_count)->toBe(5);
});

test('incomplete prompts cannot be copied publicly', function (): void {
    $prompt = Prompt::factory()->pending()->create([
        'copy_count' => 7,
    ]);

    $this->postJson("/prompts/{$prompt->id}/copy")
        ->assertNotFound();

    expect($prompt->refresh()->copy_count)->toBe(7);
});

test('prompt card props include thumbnail preview category and copy count', function (): void {
    $prompt = Prompt::factory()->create([
        'title' => 'Soft fashion campaign',
        'prompt' => 'Create a soft fashion campaign image with layered fabric, clean daylight, and a pale set.',
        'thumbnail_path' => 'prompts/thumbnails/fashion-card.jpg',
        'category' => Prompt::CATEGORY_FASHION,
        'copy_count' => 12,
        'ai_model' => 'claude-sonnet-4',
    ]);

    $this->get('/')
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->has('prompts.data.0', fn (Assert $page) => $page
                ->where('id', $prompt->id)
                ->where('thumbnail_url', Storage::disk('public')->url('prompts/thumbnails/fashion-card.jpg'))
                ->where('prompt_preview', 'Create a soft fashion campaign image with layered fabric, clean daylight, and a pale set.')
                ->where('category', Prompt::CATEGORY_FASHION)
                ->where('copy_count', 12)
                ->where('source_label', $prompt->user->name)
                ->where('model_label', 'Claude Sonnet 4')
                ->etc()));
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

test('admins can view prompt dashboard summaries', function (): void {
    config([
        'ai.prompt_library.provider' => 'openai',
        'ai.providers.openai.key' => null,
    ]);

    $admin = User::factory()->admin()->create();

    Prompt::factory()->create(['status' => Prompt::STATUS_COMPLETED]);
    Prompt::factory()->pending()->create();
    Prompt::factory()->failed()->create();

    $this->actingAs($admin)
        ->get('/admin/prompts')
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/prompts/index')
            ->where('summary.total', 3)
            ->where('summary.completed', 1)
            ->where('summary.pending', 1)
            ->where('summary.failed', 1)
            ->where('aiConfiguration.is_configured', false)
            ->where('aiConfiguration.credential_env', 'OPENAI_API_KEY'));
});

test('admins can regenerate failed prompt references', function (): void {
    Bus::fake();

    $admin = User::factory()->admin()->create();
    $prompt = Prompt::factory()->failed()->create([
        'title' => 'Failed prompt',
        'prompt' => 'Old prompt',
        'error_message' => 'Old error',
    ]);

    $this->actingAs($admin)
        ->post("/admin/prompts/{$prompt->id}/regenerate")
        ->assertRedirect();

    $prompt->refresh();

    expect($prompt)
        ->title->toBe('Generating prompt')
        ->prompt->toBeNull()
        ->status->toBe(Prompt::STATUS_PENDING)
        ->error_message->toBeNull()
        ->generated_at->toBeNull();

    Bus::assertDispatched(
        GeneratePromptFromReferenceImageJob::class,
        fn (GeneratePromptFromReferenceImageJob $job): bool => $job->prompt->is($prompt),
    );
});

test('dashboard returns prompt operations data for admins', function (): void {
    $admin = User::factory()->admin()->create();

    Prompt::factory()->create(['title' => 'Completed library prompt']);
    Prompt::factory()->pending()->create();

    $this->actingAs($admin)
        ->get('/dashboard')
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->where('canManagePrompts', true)
            ->where('promptSummary.total', 2)
            ->where('promptSummary.completed', 1)
            ->where('promptSummary.pending', 1)
            ->has('recentPrompts', 2));
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
    config(['ai.providers.openai.key' => 'test-key']);

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

    app()->call([(new GeneratePromptFromReferenceImageJob($prompt)), 'handle']);

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
    config(['ai.providers.openai.key' => 'test-key']);

    Storage::fake('public');

    Storage::disk('public')->put('prompts/references/reference.jpg', 'fake-image');

    $prompt = Prompt::factory()->pending()->create([
        'reference_image_path' => 'prompts/references/reference.jpg',
        'thumbnail_path' => 'prompts/thumbnails/reference.jpg',
    ]);

    ReferenceImagePromptAgent::fake(function (): never {
        throw new RuntimeException('vision model unavailable');
    })->preventStrayPrompts();

    expect(fn () => app()->call([(new GeneratePromptFromReferenceImageJob($prompt)), 'handle']))
        ->toThrow(RuntimeException::class, 'vision model unavailable');

    $prompt->refresh();

    expect($prompt)
        ->status->toBe(Prompt::STATUS_FAILED)
        ->error_message->toBe('vision model unavailable');
});

test('the prompt generation job fails clearly when ai credentials are missing', function (): void {
    config([
        'ai.prompt_library.provider' => 'openai',
        'ai.providers.openai.key' => null,
    ]);

    Storage::fake('public');

    Storage::disk('public')->put('prompts/references/reference.jpg', 'fake-image');

    $prompt = Prompt::factory()->pending()->create([
        'reference_image_path' => 'prompts/references/reference.jpg',
        'thumbnail_path' => 'prompts/thumbnails/reference.jpg',
    ]);

    ReferenceImagePromptAgent::fake()->preventStrayPrompts();

    expect(fn () => app()->call([(new GeneratePromptFromReferenceImageJob($prompt)), 'handle']))
        ->toThrow(RuntimeException::class, 'OPENAI_API_KEY');

    $prompt->refresh();

    expect($prompt)
        ->status->toBe(Prompt::STATUS_FAILED)
        ->error_message->toContain('OPENAI_API_KEY');

    ReferenceImagePromptAgent::assertNeverPrompted();
});

test('completed prompt detail exposes copyable prompt text', function (): void {
    $prompt = Prompt::factory()->create([
        'prompt' => 'Create a detailed fashion editorial image.',
        'category' => Prompt::CATEGORY_FASHION,
        'status' => Prompt::STATUS_COMPLETED,
        'copy_count' => 3,
    ]);
    $related = Prompt::factory()->create([
        'category' => Prompt::CATEGORY_FASHION,
        'status' => Prompt::STATUS_COMPLETED,
    ]);

    $this->get("/prompts/{$prompt->id}")
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('prompts/show')
            ->where('promptItem.id', $prompt->id)
            ->where('promptItem.prompt', 'Create a detailed fashion editorial image.')
            ->where('promptItem.copy_count', 3)
            ->where('promptItem.model_label', 'Gpt 5.4')
            ->where('categoryCounts.fashion', 2)
            ->has('relatedPrompts', 1)
            ->where('relatedPrompts.0.id', $related->id));
});

test('incomplete prompts are hidden from public detail routes', function (): void {
    $prompt = Prompt::factory()->pending()->create();

    $this->get("/prompts/{$prompt->id}")
        ->assertNotFound();
});
