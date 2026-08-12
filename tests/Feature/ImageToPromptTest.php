<?php

use App\Ai\Agents\ReferenceImagePromptAgent;
use App\Models\User;
use Illuminate\Http\UploadedFile;

test('guests cannot access the image to prompt workspace', function (): void {
    $this->get('/image-to-prompt')->assertRedirect('/login');
});

test('verified users can view the image to prompt workspace', function (): void {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get('/image-to-prompt')
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('image-to-prompt/index')
            ->has('aiConfiguration')
            ->where('generatedPrompt', null));
});

test('users can generate a prompt from an uploaded image', function (): void {
    config([
        'ai.prompt_library.provider' => 'nvidia',
        'ai.prompt_library.model' => 'thinkingmachines/inkling',
        'ai.providers.nvidia.key' => 'test-key',
    ]);

    ReferenceImagePromptAgent::fake([[
        'title' => 'Editorial window portrait',
        'prompt' => 'Create an editorial portrait beside a rain-streaked window with soft cinematic light.',
        'negative_prompt' => 'blurry, flat light',
        'category' => 'portrait',
        'style_notes' => [
            'subject' => 'A solitary fashion subject.',
            'composition' => 'Waist-up portrait.',
            'camera_angle' => 'Eye level.',
            'lighting' => 'Soft window light.',
            'background' => 'Rain-streaked glass.',
            'colors' => 'Muted blue and charcoal.',
            'mood' => 'Reflective and cinematic.',
            'quality' => 'Editorial photography.',
        ],
    ]])->preventStrayPrompts();

    $user = User::factory()->create();

    $this->actingAs($user)
        ->post('/image-to-prompt', [
            'image' => UploadedFile::fake()->image('reference.jpg', 1200, 900)->size(500),
        ])
        ->assertRedirect('/image-to-prompt')
        ->assertSessionHas('image_to_prompt.generated.prompt', 'Create an editorial portrait beside a rain-streaked window with soft cinematic light.');

    ReferenceImagePromptAgent::assertPrompted(
        fn ($prompt): bool => $prompt->contains('visually similar image'),
    );
});

test('the uploaded reference must be a supported image', function (): void {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post('/image-to-prompt', [
            'image' => UploadedFile::fake()->create('reference.txt', 20, 'text/plain'),
        ])
        ->assertSessionHasErrors('image');
});
