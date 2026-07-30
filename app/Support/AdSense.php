<?php

namespace App\Support;

use Illuminate\Support\Str;

class AdSense
{
    /**
     * @return array{
     *     enabled: bool,
     *     client_id: string|null,
     *     test_mode: bool,
     *     slots: array{home: string|null, library: string|null, detail: string|null}
     * }
     */
    public function publicConfig(bool $adsAllowed = true): array
    {
        $clientId = $this->clientId();
        $testMode = $this->testMode();
        $enabled = $adsAllowed
            && $this->enabled()
            && ($clientId !== null || $testMode);

        return [
            'enabled' => $enabled,
            'client_id' => $enabled ? $clientId : null,
            'test_mode' => $enabled && $testMode,
            'slots' => [
                'home' => $enabled ? $this->slot('home') : null,
                'library' => $enabled ? $this->slot('library') : null,
                'detail' => $enabled ? $this->slot('detail') : null,
            ],
        ];
    }

    public function adsTxtLine(): ?string
    {
        $publisherId = $this->publisherId();

        return $publisherId === null
            ? null
            : "google.com, {$publisherId}, DIRECT, f08c47fec0942fa0";
    }

    private function enabled(): bool
    {
        return (bool) config('adsense.enabled', false);
    }

    private function testMode(): bool
    {
        return (bool) config('adsense.test_mode', false);
    }

    private function clientId(): ?string
    {
        $clientId = trim((string) config('adsense.client_id', ''));

        return $clientId === '' ? null : $clientId;
    }

    private function publisherId(): ?string
    {
        $clientId = $this->clientId();

        if ($clientId === null) {
            return null;
        }

        $publisherId = Str::startsWith($clientId, 'ca-')
            ? Str::after($clientId, 'ca-')
            : $clientId;

        return preg_match('/^pub-\d+$/', $publisherId) === 1
            ? $publisherId
            : null;
    }

    private function slot(string $name): ?string
    {
        $slot = trim((string) config("adsense.slots.{$name}", ''));

        return $slot === '' ? null : $slot;
    }
}
