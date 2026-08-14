<?php

use App\Ai\Agents\PromptVariantGeneratorAgent;
use App\Jobs\GeneratePromptVariantJob;
use App\Models\Prompt;
use App\Models\User;
use Illuminate\Support\Facades\Queue;
use LogicException;

function variantPayload(array $overrides = []): array
{
    return array_replace_recursive([
        'variants' => [[
            'gender_presentation' => 'woman',
            'age_group' => 'young adult',
            'age_range' => '25-34',
            'custom_instruction' => null,
        ]],
        'preserve' => [
            'composition', 'camera', 'framing', 'pose', 'lighting', 'background',
            'clothing_style', 'color_palette', 'mood', 'image_effect', 'negative_prompt_intent',
        ],
        'image_option' => 'text_only',
    ], $overrides);
}

test('an admin can queue multiple variants without changing the parent', function (): void {
    Queue::fake();
    $admin = User::factory()->create(['is_admin' => true]);
    $parent = Prompt::factory()->create([
        'title' => 'Cinematic city portrait',
        'prompt' => 'A generic adult subject standing in rain under neon light.',
        'status' => Prompt::STATUS_COMPLETED,
    ]);
    $original = $parent->refresh()->getAttributes();
    ksort($original);

    $payload = variantPayload([
        'variants' => [
            ['gender_presentation' => 'woman', 'age_group' => 'young adult', 'age_range' => '25-34'],
            ['gender_presentation' => 'man', 'age_group' => 'middle-aged adult', 'age_range' => '45-54'],
        ],
    ]);

    $this->actingAs($admin)
        ->post(route('admin.prompts.variants.store', $parent), $payload)
        ->assertRedirect()
        ->assertSessionHas('success');

    $refreshed = $parent->refresh()->getAttributes();
    ksort($refreshed);

    expect($refreshed)->toBe($original)
        ->and($parent->variants)->toHaveCount(2)
        ->and($parent->variants->pluck('base_prompt_id')->unique()->all())->toBe([$parent->id])
        ->and($parent->variants->pluck('variation_preset')->unique()->all())->toBe(['subject-demographic'])
        ->and($parent->variants->pluck('status')->unique()->all())->toBe([Prompt::STATUS_PENDING]);

    Queue::assertPushed(GeneratePromptVariantJob::class, 2);
    Queue::assertPushed(GeneratePromptVariantJob::class, function (GeneratePromptVariantJob $job): bool {
        return $job->queue === null;
    });
});

test('duplicate variant requests are idempotently skipped', function (): void {
    Queue::fake();
    $admin = User::factory()->create(['is_admin' => true]);
    $parent = Prompt::factory()->create();

    $this->actingAs($admin)->post(route('admin.prompts.variants.store', $parent), variantPayload());
    $this->actingAs($admin)->post(route('admin.prompts.variants.store', $parent), variantPayload())
        ->assertSessionHas('success', '0 queued, 1 duplicates skipped, 0 rejected for safety, 0 failed.');

    expect($parent->variants()->count())->toBe(1);
    Queue::assertPushed(GeneratePromptVariantJob::class, 1);
});

test('unsafe parent concepts reject minor variants without creating children', function (): void {
    Queue::fake();
    $admin = User::factory()->create(['is_admin' => true]);
    $parent = Prompt::factory()->create(['prompt' => 'A sensual nightclub lingerie campaign.']);

    $payload = variantPayload([
        'variants' => [[
            'gender_presentation' => 'girl',
            'age_group' => 'child',
            'age_range' => '8-12',
        ]],
    ]);

    $this->actingAs($admin)->post(route('admin.prompts.variants.store', $parent), $payload)
        ->assertSessionHas('success', '0 queued, 0 duplicates skipped, 1 rejected for safety, 0 failed.');

    expect($parent->variants()->count())->toBe(0);
    Queue::assertNothingPushed();
});

test('non administrators cannot create variants', function (): void {
    $user = User::factory()->create(['is_admin' => false]);
    $parent = Prompt::factory()->create();

    $this->actingAs($user)
        ->post(route('admin.prompts.variants.store', $parent), variantPayload())
        ->assertForbidden();
});

test('variant generation validates structured output and leaves the child as draft', function (): void {
    config([
        'ai.prompt_library.provider' => 'anthropic',
        'ai.prompt_library.model' => 'claude-sonnet-test',
        'ai.providers.anthropic.key' => 'test-key',
    ]);
    $parent = Prompt::factory()->create(['prompt' => 'A person in a cinematic rain portrait.']);
    $child = Prompt::factory()->create([
        'generation_mode' => Prompt::GENERATION_MODE_VARIANT,
        'base_prompt_id' => $parent->id,
        'variation_preset' => 'subject-demographic',
        'variation_key' => hash('sha256', 'woman'),
        'variation_variables' => variantPayload()['variants'][0] + ['image_option' => 'text_only'],
        'prompt' => null,
        'status' => Prompt::STATUS_PENDING,
    ]);

    PromptVariantGeneratorAgent::fake([[
        'title' => 'Young Woman in Cinematic Rain',
        'prompt' => 'A young adult woman stands in cinematic rain under controlled neon light.',
        'negative_prompt' => 'identity drift, malformed hands, text, watermark',
        'thumbnail_prompt' => 'Portrait-format cinematic rain scene with a young adult woman.',
        'change_summary' => ['Specified a young adult woman.'],
        'preserved_elements' => ['composition', 'lighting'],
        'safety_notes' => [],
    ]])->preventStrayPrompts();

    app()->call([(new GeneratePromptVariantJob($child, $parent)), 'handle']);

    expect($child->refresh())
        ->status->toBe(Prompt::STATUS_PENDING)
        ->prompt->toContain('young adult woman')
        ->base_prompt_id->toBe($parent->id)
        ->ai_provider->toBe('anthropic')
        ->and($child->variation_variables['generation']['change_summary'])->toBe(['Specified a young adult woman.'])
        ->and($parent->refresh()->prompt)->toBe('A person in a cinematic rain portrait.');
});

test('empty AI output fails the child without publishing it', function (): void {
    config(['ai.prompt_library.provider' => 'anthropic', 'ai.providers.anthropic.key' => 'test-key']);
    $parent = Prompt::factory()->create(['prompt' => 'A studio portrait.']);
    $child = Prompt::factory()->create([
        'generation_mode' => Prompt::GENERATION_MODE_VARIANT,
        'base_prompt_id' => $parent->id,
        'variation_preset' => 'subject-demographic',
        'variation_key' => hash('sha256', 'empty'),
        'variation_variables' => ['subject' => ['gender_presentation' => 'man'], 'image_option' => 'text_only'],
        'status' => Prompt::STATUS_PENDING,
    ]);
    PromptVariantGeneratorAgent::fake([[
        'title' => '', 'prompt' => '', 'negative_prompt' => null, 'thumbnail_prompt' => null,
        'change_summary' => [], 'preserved_elements' => [], 'safety_notes' => ['Rejected.'],
    ]]);

    expect(fn () => app()->call([(new GeneratePromptVariantJob($child, $parent)), 'handle']))->toThrow(RuntimeException::class);
    expect($child->refresh()->status)->toBe(Prompt::STATUS_FAILED);
});

test('self and circular parent relationships are rejected', function (): void {
    $first = Prompt::factory()->create();
    $second = Prompt::factory()->create(['base_prompt_id' => $first->id]);

    expect(fn () => $first->update(['base_prompt_id' => $first->id]))->toThrow(LogicException::class)
        ->and(fn () => $first->update(['base_prompt_id' => $second->id]))->toThrow(LogicException::class);
});

test('a parent with variants cannot be deleted while deleting a child preserves its family', function (): void {
    $admin = User::factory()->create(['is_admin' => true]);
    $parent = Prompt::factory()->create();
    $first = Prompt::factory()->create(['base_prompt_id' => $parent->id]);
    $second = Prompt::factory()->create(['base_prompt_id' => $parent->id]);

    $this->actingAs($admin)->delete(route('admin.prompts.destroy', $parent))->assertSessionHasErrors('delete');
    $this->actingAs($admin)->delete(route('admin.prompts.variants.destroy', [$parent, $first]))->assertRedirect();

    expect($parent->fresh())->not->toBeNull()
        ->and($first->fresh())->toBeNull()
        ->and($second->fresh())->not->toBeNull();
});
