<?php

use App\Models\Prompt;
use Illuminate\Database\QueryException;
use Illuminate\Support\Str;

it('assigns every prompt a unique public identifier', function () {
    $firstPrompt = Prompt::factory()->create();
    $secondPrompt = Prompt::factory()->create();

    expect($firstPrompt->prompt_id)
        ->toBeString()
        ->toHaveLength(36)
        ->and(Str::isUuid($firstPrompt->prompt_id))->toBeTrue()
        ->and($secondPrompt->prompt_id)->not->toBe($firstPrompt->prompt_id);
});

it('enforces prompt identifier uniqueness in the database', function () {
    $prompt = Prompt::factory()->create();

    expect(fn () => Prompt::factory()->create(['prompt_id' => $prompt->prompt_id]))
        ->toThrow(QueryException::class);
});
