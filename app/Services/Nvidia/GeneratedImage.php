<?php

namespace App\Services\Nvidia;

final readonly class GeneratedImage
{
    public function __construct(
        public string $contents,
        public string $mimeType,
    ) {}
}
