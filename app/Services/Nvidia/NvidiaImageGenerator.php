<?php

namespace App\Services\Nvidia;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Throwable;

class NvidiaImageGenerator
{
    public function generate(string $prompt, int $timeout): GeneratedImage
    {
        $url = config('ai.providers.nvidia.image.url');
        $key = config('ai.providers.nvidia.image.key');

        if (! is_string($url) || trim($url) === '') {
            throw new RuntimeException('NVIDIA image generation URL is not configured.');
        }

        if (! is_string($key) || trim($key) === '') {
            throw new RuntimeException('NVIDIA image generation is missing NVIDIA_API_KEY.');
        }

        $this->ensureModelMatchesEndpoint($url);

        $response = Http::acceptJson()
            ->asJson()
            ->withToken($key)
            ->connectTimeout(10)
            ->timeout($timeout)
            ->retry([500, 1500], function (Throwable $exception, PendingRequest $request): bool {
                return $exception instanceof ConnectionException
                    || ($exception instanceof RequestException && $exception->response->serverError());
            }, throw: false)
            ->post($url, [
                'prompt' => $prompt,
                'width' => (int) config('ai.providers.nvidia.image.width', 832),
                'height' => (int) config('ai.providers.nvidia.image.height', 1248),
                'steps' => (int) config('ai.providers.nvidia.image.steps', 4),
                'samples' => 1,
                'seed' => 0,
                'cfg_scale' => (float) config('ai.providers.nvidia.image.cfg_scale', 1),
            ]);

        if ($response->failed()) {
            throw new RuntimeException($this->failureMessage($response));
        }

        $base64 = $response->json('artifacts.0.base64')
            ?? $response->json('data.0.b64_json');

        if (is_string($base64) && $base64 !== '') {
            return $this->fromBase64($base64);
        }

        $imageUrl = $response->json('artifacts.0.url')
            ?? $response->json('data.0.url');

        if (is_string($imageUrl) && $imageUrl !== '') {
            return $this->download($imageUrl, $timeout);
        }

        throw new RuntimeException('NVIDIA image generation returned no image.');
    }

    private function fromBase64(string $base64): GeneratedImage
    {
        if (str_starts_with($base64, 'data:image/')) {
            $base64 = str_contains($base64, ',') ? explode(',', $base64, 2)[1] : '';
        }

        $contents = base64_decode($base64, true);

        if (! is_string($contents) || $contents === '') {
            throw new RuntimeException('NVIDIA image generation returned invalid image data.');
        }

        return new GeneratedImage($contents, $this->detectMimeType($contents));
    }

    private function ensureModelMatchesEndpoint(string $url): void
    {
        $model = config('ai.providers.nvidia.image.model');
        $host = parse_url($url, PHP_URL_HOST);
        $path = parse_url($url, PHP_URL_PATH);

        if ($host !== 'ai.api.nvidia.com' || ! is_string($model) || ! is_string($path)) {
            return;
        }

        if (! str_ends_with(rtrim($path, '/'), '/'.trim($model, '/'))) {
            throw new RuntimeException('NVIDIA image model and endpoint do not match. Restart the queue worker after changing image model configuration.');
        }
    }

    private function failureMessage(Response $response): string
    {
        $message = "NVIDIA image generation failed with status {$response->status()}.";
        $details = $response->json('detail');

        if (! is_array($details)) {
            return $message;
        }

        $validationMessages = collect($details)
            ->filter(fn (mixed $detail): bool => is_array($detail) && is_string($detail['msg'] ?? null))
            ->map(function (array $detail): string {
                $location = is_array($detail['loc'] ?? null) ? end($detail['loc']) : null;
                $prefix = is_string($location) ? "{$location}: " : '';

                return $prefix.$detail['msg'];
            })
            ->unique()
            ->take(3)
            ->implode(' ');

        return $validationMessages === '' ? $message : "{$message} {$validationMessages}";
    }

    private function download(string $url, int $timeout): GeneratedImage
    {
        if (! $this->isSafeImageUrl($url)) {
            throw new RuntimeException('NVIDIA image generation returned an unsafe image URL.');
        }

        $response = Http::accept('image/*')
            ->connectTimeout(10)
            ->timeout($timeout)
            ->get($url);

        if ($response->failed()) {
            throw new RuntimeException('Unable to download the NVIDIA generated image.');
        }

        $contents = $response->body();

        if ($contents === '') {
            throw new RuntimeException('NVIDIA generated image download was empty.');
        }

        return new GeneratedImage($contents, $this->detectMimeType($contents));
    }

    private function detectMimeType(string $contents): string
    {
        if (strlen($contents) > 20 * 1024 * 1024) {
            throw new RuntimeException('NVIDIA image generation returned an image that is too large.');
        }

        $mimeType = (new \finfo(FILEINFO_MIME_TYPE))->buffer($contents);

        if (! in_array($mimeType, ['image/jpeg', 'image/png', 'image/webp'], true)) {
            throw new RuntimeException('NVIDIA image generation returned an unsupported image format.');
        }

        return $mimeType;
    }

    private function isSafeImageUrl(string $url): bool
    {
        $parts = parse_url($url);

        if (($parts['scheme'] ?? null) !== 'https' || ! is_string($parts['host'] ?? null)) {
            return false;
        }

        $host = strtolower($parts['host']);

        if ($host === 'localhost') {
            return false;
        }

        if (filter_var($host, FILTER_VALIDATE_IP) !== false) {
            return filter_var($host, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false;
        }

        return true;
    }
}
