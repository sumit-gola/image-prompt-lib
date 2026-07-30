<?php

namespace App\Actions\Prompts;

use RuntimeException;

class ResolvePromptLibraryAiConfiguration
{
    /**
     * @return array{provider: string|null, model: string|null, timeout: int, is_configured: bool, message: string|null, credential_env: string|null}
     */
    public function handle(): array
    {
        $provider = config('ai.prompt_library.provider') ?: config('ai.default');
        $model = config('ai.prompt_library.model');
        $timeout = (int) config('ai.prompt_library.timeout', 120);

        $provider = is_string($provider) && $provider !== '' ? $provider : null;
        $model = is_string($model) && $model !== '' ? $model : null;
        $credentialEnv = $provider === null ? null : $this->credentialEnvironmentName($provider);

        if ($provider === null) {
            return $this->failed($provider, $model, $timeout, null, 'No AI provider is configured for prompt generation.');
        }

        $providerConfig = config("ai.providers.{$provider}");

        if (! is_array($providerConfig)) {
            return $this->failed($provider, $model, $timeout, null, "AI provider [{$provider}] is not defined in config/ai.php.");
        }

        if ($provider === 'openai-compatible' && ! filled($providerConfig['url'] ?? null)) {
            return $this->failed($provider, $model, $timeout, 'OPENAI_COMPATIBLE_URL', 'AI provider [openai-compatible] is missing OPENAI_COMPATIBLE_URL.');
        }

        if ($this->requiresCredential($provider) && ! filled($providerConfig['key'] ?? null)) {
            return $this->failed($provider, $model, $timeout, $credentialEnv, "AI provider [{$provider}] is missing {$credentialEnv}.");
        }

        return [
            'provider' => $provider,
            'model' => $model,
            'timeout' => $timeout,
            'is_configured' => true,
            'message' => null,
            'credential_env' => $credentialEnv,
        ];
    }

    /**
     * @return array{provider: string|null, model: string|null, timeout: int, is_configured: false, message: string, credential_env: string|null}
     */
    private function failed(?string $provider, ?string $model, int $timeout, ?string $credentialEnv, string $message): array
    {
        return [
            'provider' => $provider,
            'model' => $model,
            'timeout' => $timeout,
            'is_configured' => false,
            'message' => $message,
            'credential_env' => $credentialEnv,
        ];
    }

    public function ensureConfigured(): void
    {
        $configuration = $this->handle();

        if (! $configuration['is_configured']) {
            throw new RuntimeException($configuration['message'] ?? 'AI provider is not configured.');
        }
    }

    private function requiresCredential(string $provider): bool
    {
        return ! in_array($provider, ['ollama', 'openai-compatible'], true);
    }

    private function credentialEnvironmentName(string $provider): string
    {
        return match ($provider) {
            'azure' => 'AZURE_OPENAI_API_KEY',
            'bedrock' => 'AWS_BEARER_TOKEN_BEDROCK',
            'eleven' => 'ELEVENLABS_API_KEY',
            'openai-compatible' => 'OPENAI_COMPATIBLE_API_KEY',
            default => strtoupper(str_replace('-', '_', $provider)).'_API_KEY',
        };
    }
}
