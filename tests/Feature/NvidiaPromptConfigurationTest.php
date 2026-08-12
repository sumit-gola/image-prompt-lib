<?php

use App\Actions\Prompts\ResolvePromptLibraryAiConfiguration;

test('nvidia inkling is configured as an openai compatible vision provider', function (): void {
    config([
        'ai.prompt_library.provider' => 'nvidia',
        'ai.prompt_library.model' => 'thinkingmachines/inkling',
        'ai.providers.nvidia.key' => 'test-nvidia-key',
    ]);

    $configuration = app(ResolvePromptLibraryAiConfiguration::class)->handle();

    expect(config('ai.providers.nvidia'))
        ->toMatchArray([
            'driver' => 'openai-compatible',
            'url' => 'https://integrate.api.nvidia.com/v1',
        ])
        ->and($configuration)
        ->toMatchArray([
            'provider' => 'nvidia',
            'model' => 'thinkingmachines/inkling',
            'is_configured' => true,
            'credential_env' => 'NVIDIA_API_KEY',
        ]);
});

test('nvidia prompt generation reports a missing api key', function (): void {
    config([
        'ai.prompt_library.provider' => 'nvidia',
        'ai.providers.nvidia.key' => null,
    ]);

    $configuration = app(ResolvePromptLibraryAiConfiguration::class)->handle();

    expect($configuration)
        ->toMatchArray([
            'is_configured' => false,
            'credential_env' => 'NVIDIA_API_KEY',
        ])
        ->and($configuration['message'])
        ->toContain('NVIDIA_API_KEY');
});
