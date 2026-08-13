<?php

namespace App\Actions\Prompts;

use RuntimeException;

class ResolvePromptLibraryImageConfiguration
{
    /**
     * @var list<string>
     */
    private const IMAGE_PROVIDERS = ['openai', 'gemini', 'nvidia', 'xai'];

    /**
     * @return array{provider: string|null, model: string|null, timeout: int, is_configured: bool, message: string|null, credential_env: string|null}
     */
    public function handle(): array
    {
        $provider = config('ai.prompt_library.image_provider') ?: config('ai.default_for_images');
        $model = config('ai.prompt_library.image_model');
        $timeout = (int) config('ai.prompt_library.image_timeout', 120);

        $provider = is_string($provider) && $provider !== '' ? $provider : null;
        $model = is_string($model) && $model !== '' ? $model : null;
        $credentialEnv = $provider === null ? null : $this->credentialEnvironmentName($provider);

        if ($provider === null) {
            return $this->failed($provider, $model, $timeout, null, 'No AI image provider is configured for thumbnail generation.');
        }

        if (! in_array($provider, self::IMAGE_PROVIDERS, true)) {
            return $this->failed(
                $provider,
                $model,
                $timeout,
                $credentialEnv,
                "AI image provider [{$provider}] cannot generate thumbnails. Configure PROMPT_LIBRARY_IMAGE_PROVIDER as openai, gemini, nvidia, or xai.",
            );
        }

        $providerConfig = config("ai.providers.{$provider}");

        if (! is_array($providerConfig)) {
            return $this->failed($provider, $model, $timeout, null, "AI image provider [{$provider}] is not defined in config/ai.php.");
        }

        $providerKey = $provider === 'nvidia'
            ? data_get($providerConfig, 'image.key')
            : ($providerConfig['key'] ?? null);

        if (! filled($providerKey)) {
            return $this->failed($provider, $model, $timeout, $credentialEnv, "AI image provider [{$provider}] is missing {$credentialEnv}.");
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

    public function ensureConfigured(): void
    {
        $configuration = $this->handle();

        if (! $configuration['is_configured']) {
            throw new RuntimeException($configuration['message'] ?? 'AI image provider is not configured.');
        }
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

    private function credentialEnvironmentName(string $provider): string
    {
        return match ($provider) {
            'openai' => 'OPENAI_API_KEY',
            'gemini' => 'GEMINI_API_KEY',
            'nvidia' => 'NVIDIA_API_KEY',
            'xai' => 'XAI_API_KEY',
            default => strtoupper(str_replace('-', '_', $provider)).'_API_KEY',
        };
    }
}
