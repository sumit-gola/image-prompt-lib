<?php

use App\Ai\Agents\AutoPromptGeneratorAgent;
use App\Ai\Agents\ReferenceImagePromptAgent;
use App\Jobs\GenerateAutoPromptJob;
use App\Jobs\GeneratePromptFromReferenceImageJob;
use App\Models\Prompt;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Laravel\Ai\Image;

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
        'ai.prompt_library.image_provider' => null,
        'ai.providers.openai.key' => null,
        'ai.providers.gemini.key' => null,
    ]);

    $admin = User::factory()->admin()->create();

    Prompt::factory()->create(['status' => Prompt::STATUS_COMPLETED]);
    Prompt::factory()->pending()->create();
    Prompt::factory()->failed()->create();
    Prompt::factory()->auto()->create(['copy_count' => 4]);
    Prompt::factory()->imported()->create(['copy_count' => 6]);

    $this->actingAs($admin)
        ->get('/admin/prompts')
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/prompts/index')
            ->where('summary.total', 5)
            ->where('summary.completed', 3)
            ->where('summary.pending', 1)
            ->where('summary.failed', 1)
            ->where('summary.imported', 1)
            ->where('summary.auto', 1)
            ->where('summary.reference_image', 3)
            ->where('summary.total_copies', 10)
            ->where('aiConfiguration.is_configured', false)
            ->where('aiConfiguration.credential_env', 'OPENAI_API_KEY')
            ->where('imageAiConfiguration.is_configured', false)
            ->where('imageAiConfiguration.credential_env', 'GEMINI_API_KEY'));
});

test('guest and non admin users cannot access prompt management', function (): void {
    $this->get('/admin/prompts')
        ->assertRedirect('/login');

    $this->actingAs(User::factory()->create())
        ->get('/admin/prompts')
        ->assertForbidden();
});

test('admin prompt management filters and sorts prompt records', function (): void {
    $admin = User::factory()->admin()->create();
    $local = Prompt::factory()->create([
        'title' => 'Local portrait record',
        'category' => Prompt::CATEGORY_PORTRAIT,
        'copy_count' => 3,
        'generated_at' => now()->subDays(2),
    ]);
    $imported = Prompt::factory()->imported()->create([
        'title' => 'PromptPlum product record',
        'category' => Prompt::CATEGORY_PRODUCT,
        'copy_count' => 19,
        'source_slug' => 'chrome-perfume-source',
        'generated_at' => now()->subDay(),
    ]);
    $auto = Prompt::factory()->auto()->failed()->create([
        'title' => 'Auto failed record',
        'category' => Prompt::CATEGORY_ART,
        'copy_count' => 9,
        'generated_at' => now(),
    ]);

    $statusResults = $this->actingAs($admin)
        ->get('/admin/prompts?status=failed')
        ->inertiaProps('prompts.data');
    $categoryResults = $this->actingAs($admin)
        ->get('/admin/prompts?category=product')
        ->inertiaProps('prompts.data');
    $modeResults = $this->actingAs($admin)
        ->get('/admin/prompts?generation_mode=imported')
        ->inertiaProps('prompts.data');
    $sourceResults = $this->actingAs($admin)
        ->get('/admin/prompts?source_site=local&sort=title')
        ->inertiaProps('prompts.data');
    $searchResults = $this->actingAs($admin)
        ->get('/admin/prompts?search=chrome-perfume-source')
        ->inertiaProps('prompts.data');
    $copySortResults = $this->actingAs($admin)
        ->get('/admin/prompts?sort=most_copied')
        ->inertiaProps('prompts.data');

    expect(collect($statusResults)->pluck('id')->all())->toBe([$auto->id])
        ->and(collect($categoryResults)->pluck('id')->all())->toBe([$imported->id])
        ->and(collect($modeResults)->pluck('id')->all())->toBe([$imported->id])
        ->and(collect($sourceResults)->pluck('id')->all())->toBe([$auto->id, $local->id])
        ->and(collect($searchResults)->pluck('id')->all())->toBe([$imported->id])
        ->and(collect($copySortResults)->pluck('id')->first())->toBe($imported->id);
});

test('admin prompt management supports allowed per page sizes', function (): void {
    $admin = User::factory()->admin()->create();

    Prompt::factory()->count(60)->create();

    $this->actingAs($admin)
        ->get('/admin/prompts?per_page=48')
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->where('filters.per_page', 48)
            ->where('prompts.per_page', 48)
            ->has('prompts.data', 48));

    $this->actingAs($admin)
        ->get('/admin/prompts?per_page=999')
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->where('filters.per_page', 24)
            ->where('prompts.per_page', 24)
            ->has('prompts.data', 24));
});

test('admins can open the prompt edit page', function (): void {
    $admin = User::factory()->admin()->create();
    $prompt = Prompt::factory()->create([
        'title' => 'Editable prompt',
        'copy_count' => 12,
    ]);

    $this->actingAs($admin)
        ->get("/admin/prompts/{$prompt->id}/edit")
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/prompts/edit')
            ->where('promptItem.id', $prompt->id)
            ->where('promptItem.title', 'Editable prompt')
            ->where('promptItem.copy_count', 12)
            ->where('promptItem.edit_url', route('admin.prompts.edit', $prompt))
            ->where('statuses.0', Prompt::STATUS_PENDING)
            ->where('categories.0', Prompt::CATEGORY_PORTRAIT));
});

test('admins can update prompt metadata and replace assets', function (): void {
    Storage::fake('public');

    Storage::disk('public')->put('prompts/thumbnails/old.jpg', 'old-thumbnail');
    Storage::disk('public')->put('prompts/references/old.jpg', 'old-reference');

    $admin = User::factory()->admin()->create();
    $prompt = Prompt::factory()->failed()->create([
        'thumbnail_path' => 'prompts/thumbnails/old.jpg',
        'reference_image_path' => 'prompts/references/old.jpg',
    ]);

    $this->actingAs($admin)
        ->from("/admin/prompts/{$prompt->id}/edit")
        ->patch("/admin/prompts/{$prompt->id}", [
            'title' => 'Updated prompt title',
            'prompt' => 'Create a refined art prompt with clean studio lighting.',
            'negative_prompt' => ' ',
            'thumbnail_prompt' => 'Bright art thumbnail prompt.',
            'category' => Prompt::CATEGORY_ART,
            'status' => Prompt::STATUS_COMPLETED,
            'generated_at' => '2026-07-30 10:20:00',
            'style_notes' => [
                'subject' => 'Replaceable subject.',
                'lighting' => 'Softbox key light.',
                'mood' => 'Calm and polished.',
            ],
            'thumbnail' => UploadedFile::fake()->image('new-thumbnail.jpg', 600, 600)->size(200),
            'reference_image' => UploadedFile::fake()->image('new-reference.jpg', 800, 1000)->size(300),
        ])
        ->assertRedirect("/admin/prompts/{$prompt->id}/edit")
        ->assertSessionHasNoErrors();

    $prompt->refresh();

    expect($prompt)
        ->title->toBe('Updated prompt title')
        ->prompt->toBe('Create a refined art prompt with clean studio lighting.')
        ->negative_prompt->toBeNull()
        ->thumbnail_prompt->toBe('Bright art thumbnail prompt.')
        ->category->toBe(Prompt::CATEGORY_ART)
        ->status->toBe(Prompt::STATUS_COMPLETED)
        ->generated_at->format('Y-m-d H:i:s')->toBe('2026-07-30 10:20:00');

    expect($prompt->style_notes)
        ->toHaveKey('subject', 'Replaceable subject.')
        ->toHaveKey('lighting', 'Softbox key light.')
        ->toHaveKey('mood', 'Calm and polished.');

    Storage::disk('public')->assertMissing('prompts/thumbnails/old.jpg');
    Storage::disk('public')->assertMissing('prompts/references/old.jpg');
    Storage::disk('public')->assertExists($prompt->thumbnail_path);
    Storage::disk('public')->assertExists($prompt->reference_image_path);
});

test('completed prompt edits require prompt text', function (): void {
    $admin = User::factory()->admin()->create();
    $prompt = Prompt::factory()->failed()->create();

    $this->actingAs($admin)
        ->from("/admin/prompts/{$prompt->id}/edit")
        ->patch("/admin/prompts/{$prompt->id}", [
            'title' => 'Needs prompt',
            'prompt' => '',
            'negative_prompt' => '',
            'thumbnail_prompt' => '',
            'category' => Prompt::CATEGORY_OTHER,
            'status' => Prompt::STATUS_COMPLETED,
        ])
        ->assertRedirect("/admin/prompts/{$prompt->id}/edit")
        ->assertSessionHasErrors('prompt');
});

test('admins can delete prompt records and local assets', function (): void {
    Storage::fake('public');

    Storage::disk('public')->put('prompts/thumbnails/delete.jpg', 'thumbnail');
    Storage::disk('public')->put('prompts/references/delete.jpg', 'reference');

    $admin = User::factory()->admin()->create();
    $prompt = Prompt::factory()->create([
        'thumbnail_path' => 'prompts/thumbnails/delete.jpg',
        'reference_image_path' => 'prompts/references/delete.jpg',
    ]);

    $this->actingAs($admin)
        ->delete("/admin/prompts/{$prompt->id}")
        ->assertRedirect();

    $this->assertDatabaseMissing('prompts', ['id' => $prompt->id]);
    Storage::disk('public')->assertMissing('prompts/thumbnails/delete.jpg');
    Storage::disk('public')->assertMissing('prompts/references/delete.jpg');
});

test('admin prompt bulk actions update selected records', function (): void {
    $admin = User::factory()->admin()->create();
    $first = Prompt::factory()->create([
        'prompt' => 'First prompt text',
        'status' => Prompt::STATUS_PENDING,
        'category' => Prompt::CATEGORY_OTHER,
    ]);
    $second = Prompt::factory()->create([
        'prompt' => 'Second prompt text',
        'status' => Prompt::STATUS_FAILED,
        'category' => Prompt::CATEGORY_OTHER,
    ]);

    $this->actingAs($admin)
        ->patch('/admin/prompts/bulk', [
            'action' => 'category',
            'prompt_ids' => [$first->id, $second->id],
            'category' => Prompt::CATEGORY_FASHION,
        ])
        ->assertRedirect();

    expect($first->refresh()->category)->toBe(Prompt::CATEGORY_FASHION)
        ->and($second->refresh()->category)->toBe(Prompt::CATEGORY_FASHION);

    $this->actingAs($admin)
        ->patch('/admin/prompts/bulk', [
            'action' => 'status',
            'prompt_ids' => [$first->id, $second->id],
            'status' => Prompt::STATUS_COMPLETED,
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect($first->refresh()->status)->toBe(Prompt::STATUS_COMPLETED)
        ->and($second->refresh()->status)->toBe(Prompt::STATUS_COMPLETED);
});

test('admin bulk completed status rejects records without prompt text', function (): void {
    $admin = User::factory()->admin()->create();
    $prompt = Prompt::factory()->pending()->create([
        'prompt' => null,
    ]);

    $this->actingAs($admin)
        ->from('/admin/prompts')
        ->patch('/admin/prompts/bulk', [
            'action' => 'status',
            'prompt_ids' => [$prompt->id],
            'status' => Prompt::STATUS_COMPLETED,
        ])
        ->assertRedirect('/admin/prompts')
        ->assertSessionHasErrors('bulk');

    expect($prompt->refresh()->status)->toBe(Prompt::STATUS_PENDING);
});

test('admin bulk publish and draft actions update public visibility', function (): void {
    $admin = User::factory()->admin()->create();
    $draft = Prompt::factory()->pending()->create([
        'prompt' => 'Ready prompt text',
        'error_message' => 'Previous transient issue.',
    ]);
    $published = Prompt::factory()->create([
        'prompt' => 'Published prompt text',
        'status' => Prompt::STATUS_COMPLETED,
    ]);

    $this->actingAs($admin)
        ->patch('/admin/prompts/bulk', [
            'action' => 'publish',
            'prompt_ids' => [$draft->id],
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect($draft->refresh())
        ->status->toBe(Prompt::STATUS_COMPLETED)
        ->error_message->toBeNull();

    $this->actingAs($admin)
        ->patch('/admin/prompts/bulk', [
            'action' => 'draft',
            'prompt_ids' => [$published->id],
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect($published->refresh()->status)->toBe(Prompt::STATUS_PENDING);

    $visibleIds = collect($this->get('/')->inertiaProps('prompts.data'))->pluck('id');

    expect($visibleIds)
        ->toContain($draft->id)
        ->not->toContain($published->id);
});

test('admin bulk publish rejects records without prompt text', function (): void {
    $admin = User::factory()->admin()->create();
    $prompt = Prompt::factory()->pending()->create([
        'prompt' => null,
    ]);

    $this->actingAs($admin)
        ->from('/admin/prompts')
        ->patch('/admin/prompts/bulk', [
            'action' => 'publish',
            'prompt_ids' => [$prompt->id],
        ])
        ->assertRedirect('/admin/prompts')
        ->assertSessionHasErrors('bulk');

    expect($prompt->refresh()->status)->toBe(Prompt::STATUS_PENDING);
});

test('imported prompts cannot be regenerated', function (): void {
    Bus::fake();

    $admin = User::factory()->admin()->create();
    $prompt = Prompt::factory()->imported()->failed()->create();

    $this->actingAs($admin)
        ->post("/admin/prompts/{$prompt->id}/regenerate")
        ->assertStatus(422);

    expect($prompt->refresh()->status)->toBe(Prompt::STATUS_FAILED);
    Bus::assertNotDispatched(GeneratePromptFromReferenceImageJob::class);
    Bus::assertNotDispatched(GenerateAutoPromptJob::class);
});

test('admins can regenerate failed prompt references', function (): void {
    Bus::fake();
    Storage::fake('public');

    Storage::disk('public')->put('prompts/references/failed.jpg', 'failed-reference');

    $admin = User::factory()->admin()->create();
    $prompt = Prompt::factory()->failed()->create([
        'title' => 'Failed prompt',
        'prompt' => 'Old prompt',
        'error_message' => 'Old error',
        'reference_image_path' => 'prompts/references/failed.jpg',
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

test('non admins cannot create auto prompts', function (): void {
    Bus::fake();

    $user = User::factory()->create();

    $this->actingAs($user)
        ->post('/admin/prompts/auto', [
            'idea' => 'A cinematic city portrait',
            'category' => Prompt::CATEGORY_PORTRAIT,
        ])
        ->assertForbidden();

    expect(Prompt::query()->count())->toBe(0);
    Bus::assertNotDispatched(GenerateAutoPromptJob::class);
});

test('admins can create auto prompt requests', function (): void {
    Bus::fake();

    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->post('/admin/prompts/auto', [
            'idea' => 'A cinematic product photo of a matte black perfume bottle.',
            'category' => Prompt::CATEGORY_PRODUCT,
            'visual_style' => 'Luxury editorial product photography',
            'subject' => 'Replaceable product',
            'mood' => 'Premium and dramatic',
            'lighting' => 'Low side light',
            'camera_notes' => 'Low three-quarter angle',
            'target_model_notes' => 'Works well in Midjourney or Flux',
            'negative_notes' => 'No text, no watermark',
        ])
        ->assertRedirect('/admin/prompts');

    $prompt = Prompt::query()->firstOrFail();

    expect($prompt)
        ->user_id->toBe($admin->id)
        ->status->toBe(Prompt::STATUS_PENDING)
        ->generation_mode->toBe(Prompt::GENERATION_MODE_AUTO)
        ->source_idea->toContain('matte black perfume bottle')
        ->thumbnail_path->toBeNull()
        ->reference_image_path->toBeNull();

    Bus::assertDispatched(
        GenerateAutoPromptJob::class,
        fn (GenerateAutoPromptJob $job): bool => $job->prompt->is($prompt),
    );
});

test('auto prompt validation rejects missing idea and category', function (): void {
    Bus::fake();

    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->from('/admin/prompts')
        ->post('/admin/prompts/auto', [
            'idea' => '',
            'category' => 'invalid',
        ])
        ->assertRedirect('/admin/prompts')
        ->assertSessionHasErrors(['idea', 'category']);

    expect(Prompt::query()->count())->toBe(0);
    Bus::assertNotDispatched(GenerateAutoPromptJob::class);
});

test('the auto prompt job stores structured output and generated thumbnail', function (): void {
    config([
        'ai.prompt_library.provider' => 'anthropic',
        'ai.prompt_library.model' => 'claude-sonnet-test',
        'ai.providers.anthropic.key' => 'test-key',
        'ai.prompt_library.image_provider' => 'gemini',
        'ai.prompt_library.image_model' => 'imagen-test',
        'ai.providers.gemini.key' => 'test-key',
    ]);

    Storage::fake('public');

    $prompt = Prompt::factory()->auto()->pending()->create([
        'category' => Prompt::CATEGORY_FASHION,
        'source_idea' => 'Idea: fashion editorial with a replaceable subject',
        'thumbnail_path' => null,
        'reference_image_path' => null,
    ]);

    AutoPromptGeneratorAgent::fake([
        [
            'title' => 'Rainy Neon Fashion Editorial',
            'prompt' => 'Create a fashion editorial image of a replaceable subject in a rainy neon street.',
            'negative_prompt' => 'text, watermark, blurry hands',
            'category' => Prompt::CATEGORY_FASHION,
            'thumbnail_prompt' => 'Rainy neon fashion editorial preview, no text or logo.',
            'style_notes' => [
                'subject' => 'A replaceable fashion subject.',
                'composition' => 'Three-quarter framing with street depth.',
                'camera_angle' => 'Eye-level portrait lens.',
                'lighting' => 'Neon rim light and wet reflections.',
                'background' => 'Rainy city street.',
                'colors' => 'Cyan, magenta, black.',
                'mood' => 'Cinematic and confident.',
                'quality' => 'High-end editorial finish.',
                'dynamic_subject_guidance' => 'Swap in the user-provided person while preserving pose and lighting.',
            ],
        ],
    ])->preventStrayPrompts();

    Image::fake([
        base64_encode('fake-thumbnail-image'),
    ])->preventStrayImages();

    app()->call([(new GenerateAutoPromptJob($prompt)), 'handle']);

    $prompt->refresh();

    expect($prompt)
        ->status->toBe(Prompt::STATUS_COMPLETED)
        ->generation_mode->toBe(Prompt::GENERATION_MODE_AUTO)
        ->title->toBe('Rainy Neon Fashion Editorial')
        ->prompt->toContain('rainy neon street')
        ->negative_prompt->toBe('text, watermark, blurry hands')
        ->category->toBe(Prompt::CATEGORY_FASHION)
        ->thumbnail_prompt->toBe('Rainy neon fashion editorial preview, no text or logo.')
        ->ai_provider->toBe('anthropic')
        ->ai_model->toBe('claude-sonnet-test')
        ->generated_at->not->toBeNull()
        ->thumbnail_path->not->toBeNull();

    expect($prompt->style_notes)
        ->toHaveKey('dynamic_subject_guidance', 'Swap in the user-provided person while preserving pose and lighting.');

    Storage::disk('public')->assertExists($prompt->thumbnail_path);

    AutoPromptGeneratorAgent::assertPrompted(
        fn ($prompt): bool => $prompt->contains('Create an auto generated prompt library entry'),
    );

    Image::assertGenerated(
        fn ($prompt): bool => $prompt->contains('Rainy neon fashion editorial preview') && $prompt->isPortrait(),
    );
});

test('the auto prompt job marks failed text ai calls', function (): void {
    config([
        'ai.prompt_library.provider' => 'anthropic',
        'ai.providers.anthropic.key' => 'test-key',
        'ai.prompt_library.image_provider' => 'gemini',
        'ai.providers.gemini.key' => 'test-key',
    ]);

    $prompt = Prompt::factory()->auto()->pending()->create([
        'source_idea' => 'Idea: product prompt',
        'thumbnail_path' => null,
        'reference_image_path' => null,
    ]);

    AutoPromptGeneratorAgent::fake(function (): never {
        throw new RuntimeException('text model unavailable');
    })->preventStrayPrompts();

    Image::fake()->preventStrayImages();

    expect(fn () => app()->call([(new GenerateAutoPromptJob($prompt)), 'handle']))
        ->toThrow(RuntimeException::class, 'text model unavailable');

    $prompt->refresh();

    expect($prompt)
        ->status->toBe(Prompt::STATUS_FAILED)
        ->error_message->toBe('text model unavailable');

    Image::assertNothingGenerated();
});

test('the auto prompt job marks failed thumbnail generation', function (): void {
    config([
        'ai.prompt_library.provider' => 'anthropic',
        'ai.providers.anthropic.key' => 'test-key',
        'ai.prompt_library.image_provider' => 'gemini',
        'ai.providers.gemini.key' => 'test-key',
    ]);

    Storage::fake('public');

    $prompt = Prompt::factory()->auto()->pending()->create([
        'source_idea' => 'Idea: art prompt',
        'thumbnail_path' => null,
        'reference_image_path' => null,
    ]);

    AutoPromptGeneratorAgent::fake([
        [
            'title' => 'Surreal Art Frame',
            'prompt' => 'Create a surreal art image with glowing glass architecture.',
            'negative_prompt' => 'text, watermark',
            'category' => Prompt::CATEGORY_ART,
            'thumbnail_prompt' => 'Surreal glass architecture thumbnail.',
            'style_notes' => [
                'subject' => 'Glass architecture.',
                'composition' => 'Central symmetrical scene.',
                'camera_angle' => 'Wide angle.',
                'lighting' => 'Soft luminous light.',
                'background' => 'Dreamlike skyline.',
                'colors' => 'Pearl, cyan, violet.',
                'mood' => 'Surreal and calm.',
                'quality' => 'Polished digital art.',
                'dynamic_subject_guidance' => 'Replace the main subject while preserving the atmosphere.',
            ],
        ],
    ])->preventStrayPrompts();

    Image::fake(function (): never {
        throw new RuntimeException('thumbnail model unavailable');
    })->preventStrayImages();

    expect(fn () => app()->call([(new GenerateAutoPromptJob($prompt)), 'handle']))
        ->toThrow(RuntimeException::class, 'thumbnail model unavailable');

    $prompt->refresh();

    expect($prompt)
        ->status->toBe(Prompt::STATUS_FAILED)
        ->error_message->toBe('thumbnail model unavailable')
        ->thumbnail_path->toBeNull();
});

test('public library shows completed auto prompts only', function (): void {
    $completed = Prompt::factory()->auto()->create([
        'title' => 'Completed auto prompt',
        'status' => Prompt::STATUS_COMPLETED,
        'thumbnail_path' => 'prompts/thumbnails/auto-completed.png',
        'reference_image_path' => null,
    ]);

    Prompt::factory()->auto()->pending()->create([
        'title' => 'Pending auto prompt',
        'thumbnail_path' => null,
        'reference_image_path' => null,
    ]);

    Prompt::factory()->auto()->failed()->create([
        'title' => 'Failed auto prompt',
        'thumbnail_path' => null,
        'reference_image_path' => null,
    ]);

    $this->get('/')
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->has('prompts.data', 1)
            ->where('prompts.data.0.id', $completed->id)
            ->where('prompts.data.0.generation_mode', Prompt::GENERATION_MODE_AUTO)
            ->where('prompts.data.0.reference_image_url', Storage::disk('public')->url('prompts/thumbnails/auto-completed.png')));
});

test('copy endpoint works for auto prompts', function (): void {
    $prompt = Prompt::factory()->auto()->create([
        'status' => Prompt::STATUS_COMPLETED,
        'copy_count' => 9,
        'reference_image_path' => null,
    ]);

    $this->postJson("/prompts/{$prompt->id}/copy")
        ->assertSuccessful()
        ->assertJson([
            'copy_count' => 10,
        ]);

    expect($prompt->refresh()->copy_count)->toBe(10);
});

test('admins can regenerate completed auto prompts', function (): void {
    Bus::fake();
    Storage::fake('public');

    Storage::disk('public')->put('prompts/thumbnails/old-auto.png', 'old-thumbnail');

    $admin = User::factory()->admin()->create();
    $prompt = Prompt::factory()->auto()->create([
        'title' => 'Old auto prompt',
        'prompt' => 'Old prompt',
        'thumbnail_prompt' => 'Old thumbnail prompt',
        'thumbnail_path' => 'prompts/thumbnails/old-auto.png',
        'status' => Prompt::STATUS_COMPLETED,
    ]);

    $this->actingAs($admin)
        ->post("/admin/prompts/{$prompt->id}/regenerate")
        ->assertRedirect();

    $prompt->refresh();

    expect($prompt)
        ->title->toBe('Generating prompt')
        ->prompt->toBeNull()
        ->thumbnail_prompt->toBeNull()
        ->thumbnail_path->toBeNull()
        ->status->toBe(Prompt::STATUS_PENDING)
        ->error_message->toBeNull();

    Storage::disk('public')->assertMissing('prompts/thumbnails/old-auto.png');

    Bus::assertDispatched(
        GenerateAutoPromptJob::class,
        fn (GenerateAutoPromptJob $job): bool => $job->prompt->is($prompt),
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
