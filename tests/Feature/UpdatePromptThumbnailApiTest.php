<?php

use App\Models\Prompt;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

test('an admin can replace a prompt thumbnail', function (): void {
    Storage::fake('public');
    Storage::disk('public')->put('prompts/thumbnails/old.jpg', 'old thumbnail');

    $admin = User::factory()->create(['is_admin' => true]);
    $prompt = Prompt::factory()->create([
        'thumbnail_path' => 'prompts/thumbnails/old.jpg',
    ]);

    $response = $this->actingAs($admin)->postJson(
        "/api/prompts/{$prompt->id}/thumbnail",
        ['thumbnail' => UploadedFile::fake()->image('replacement.webp')],
    );

    $response
        ->assertSuccessful()
        ->assertJsonPath('data.id', $prompt->id)
        ->assertJsonPath('data.thumbnail_path', $prompt->refresh()->thumbnail_path);

    expect($prompt->thumbnail_path)
        ->toStartWith('prompts/thumbnails/')
        ->toEndWith('.webp');

    Storage::disk('public')->assertExists($prompt->thumbnail_path);
    Storage::disk('public')->assertMissing('prompts/thumbnails/old.jpg');
});

test('a guest cannot replace a prompt thumbnail', function (): void {
    $prompt = Prompt::factory()->create();

    $this->postJson("/api/prompts/{$prompt->id}/thumbnail", [
        'thumbnail' => UploadedFile::fake()->image('replacement.jpg'),
    ])->assertUnauthorized();
});

test('a non-admin cannot replace a prompt thumbnail', function (): void {
    $user = User::factory()->create(['is_admin' => false]);
    $prompt = Prompt::factory()->create();

    $this->actingAs($user)->postJson("/api/prompts/{$prompt->id}/thumbnail", [
        'thumbnail' => UploadedFile::fake()->image('replacement.jpg'),
    ])->assertForbidden();
});

test('the thumbnail must be a supported image no larger than five megabytes', function (): void {
    $admin = User::factory()->create(['is_admin' => true]);
    $prompt = Prompt::factory()->create();

    $this->actingAs($admin)->postJson("/api/prompts/{$prompt->id}/thumbnail", [
        'thumbnail' => UploadedFile::fake()->create('thumbnail.pdf', 100, 'application/pdf'),
    ])->assertUnprocessable()->assertJsonValidationErrors('thumbnail');

    $this->actingAs($admin)->postJson("/api/prompts/{$prompt->id}/thumbnail", [
        'thumbnail' => UploadedFile::fake()->image('thumbnail.jpg')->size(5121),
    ])->assertUnprocessable()->assertJsonValidationErrors('thumbnail');
});
