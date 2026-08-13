<?php

use App\Models\Prompt;

test('it returns a paginated list of completed prompts with public fields', function (): void {
    $olderPrompts = Prompt::factory()->count(15)->create([
        'generated_at' => now()->subDay(),
    ]);
    $newestPrompt = Prompt::factory()->create([
        'title' => 'Newest portrait prompt',
        'prompt' => 'Create a cinematic portrait.',
        'thumbnail_path' => 'prompts/thumbnails/newest.jpg',
        'generated_at' => now(),
    ]);
    Prompt::factory()->pending()->create();

    $this->getJson('/api/prompts')
        ->assertSuccessful()
        ->assertJsonCount(15, 'data')
        ->assertJsonPath('data.0', [
            'id' => $newestPrompt->id,
            'prompt' => 'Create a cinematic portrait.',
            'title' => 'Newest portrait prompt',
            'thumbnail_path' => 'prompts/thumbnails/newest.jpg',
        ])
        ->assertJsonPath('meta.current_page', 1)
        ->assertJsonPath('meta.per_page', 15)
        ->assertJsonPath('meta.total', 16)
        ->assertJsonPath('links.next', url('/api/prompts?page=2'));

    $this->getJson('/api/prompts?page=2')
        ->assertSuccessful()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $olderPrompts->first()->id);
});
