<?php

namespace App\Services\PromptPlum;

use App\Models\Prompt;
use App\Models\User;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use SimpleXMLElement;
use Throwable;

/**
 * @phpstan-type SitemapEntry array{url: string, slug: string, image_url: string|null, lastmod: Carbon|null}
 * @phpstan-type ParsedPrompt array{url: string, slug: string, title: string, prompt: string, image_url: string|null, tags: list<string>, category: string, model: string|null, published_at: Carbon|null, modified_at: Carbon|null}
 * @phpstan-type ImportStats array{total: int, processed: int, created: int, updated: int, skipped: int, failed: int, failures: list<array{url: string, error: string}>}
 */
class PromptPlumImporter
{
    public const SOURCE_SITE = 'promptplum';

    private const BASE_URL = 'https://promptplum.com';

    private const SITEMAP_INDEX_URL = 'https://promptplum.com/sitemap.xml';

    private const DEFAULT_PROMPT_SITEMAP_URL = 'https://promptplum.com/ai_prompt-sitemap.xml';

    private const STORAGE_DIRECTORY = 'prompts/imports/promptplum';

    /**
     * @return ImportStats
     */
    public function import(User $user, ?int $limit = null, bool $dryRun = false, int $delayMs = 500, bool $force = false): array
    {
        $entries = $this->promptEntries();

        if ($limit !== null) {
            $entries = array_slice($entries, 0, $limit);
        }

        $stats = [
            'total' => count($entries),
            'processed' => 0,
            'created' => 0,
            'updated' => 0,
            'skipped' => 0,
            'failed' => 0,
            'failures' => [],
        ];

        foreach ($entries as $index => $entry) {
            $existingPrompt = $this->existingPrompt($entry['slug']);

            if ($existingPrompt !== null && ! $force) {
                $stats['skipped']++;

                continue;
            }

            $stats['processed']++;

            try {
                $promptData = $this->parsePromptPage($this->fetchText($entry['url']), $entry);

                if (! $dryRun) {
                    $this->savePrompt($user, $existingPrompt, $promptData);
                }

                if ($existingPrompt === null) {
                    $stats['created']++;
                } else {
                    $stats['updated']++;
                }
            } catch (Throwable $exception) {
                $stats['failed']++;
                $stats['failures'][] = [
                    'url' => $entry['url'],
                    'error' => $exception->getMessage(),
                ];
            }

            if ($delayMs > 0 && $index < count($entries) - 1) {
                usleep($delayMs * 1000);
            }
        }

        return $stats;
    }

    /**
     * @return list<SitemapEntry>
     */
    public function promptEntries(): array
    {
        $entries = [];

        foreach ($this->promptSitemapUrls() as $sitemapUrl) {
            foreach ($this->parsePromptSitemap($this->fetchText($sitemapUrl)) as $entry) {
                $entries[$entry['slug']] = $entry;
            }
        }

        return array_values($entries);
    }

    /**
     * @return list<string>
     */
    private function promptSitemapUrls(): array
    {
        try {
            $locations = $this->parseSitemapIndex($this->fetchText(self::SITEMAP_INDEX_URL));
        } catch (Throwable) {
            $locations = [];
        }

        $promptSitemaps = array_values(array_filter(
            $locations,
            fn (string $url): bool => str_contains(basename((string) parse_url($url, PHP_URL_PATH)), 'ai_prompt')
        ));

        return $promptSitemaps === [] ? [self::DEFAULT_PROMPT_SITEMAP_URL] : $promptSitemaps;
    }

    /**
     * @return list<string>
     */
    private function parseSitemapIndex(string $xml): array
    {
        $sitemap = $this->loadXml($xml);
        $locations = [];

        foreach ($sitemap->sitemap as $sitemapNode) {
            $location = trim((string) $sitemapNode->loc);

            if ($location !== '') {
                $locations[] = $location;
            }
        }

        return $locations;
    }

    /**
     * @return list<SitemapEntry>
     */
    private function parsePromptSitemap(string $xml): array
    {
        $sitemap = $this->loadXml($xml);
        $namespaces = $sitemap->getNamespaces(true);
        $entries = [];

        foreach ($sitemap->url as $urlNode) {
            $url = $this->normalizePromptUrl((string) $urlNode->loc);
            $slug = $url === null ? null : $this->slugFromUrl($url);

            if ($url === null || $slug === null) {
                continue;
            }

            $imageUrl = null;

            if (isset($namespaces['image'])) {
                foreach ($urlNode->children($namespaces['image'])->image as $imageNode) {
                    $imageUrl = trim((string) $imageNode->loc) ?: null;

                    break;
                }
            }

            $entries[] = [
                'url' => $url,
                'slug' => $slug,
                'image_url' => $imageUrl,
                'lastmod' => $this->parseDate((string) $urlNode->lastmod),
            ];
        }

        return $entries;
    }

    /**
     * @param  SitemapEntry  $entry
     * @return ParsedPrompt
     */
    private function parsePromptPage(string $html, array $entry): array
    {
        $structuredData = $this->creativeWorkData($html);
        $prompt = $this->extractPromptText($html);
        $title = $this->extractTitle($html, $structuredData, $entry['slug']);
        $tags = $this->extractTags($html, $structuredData);
        $imageUrl = $entry['image_url'] ?? $this->extractImageUrl($html, $structuredData);

        return [
            'url' => $entry['url'],
            'slug' => $entry['slug'],
            'title' => $title,
            'prompt' => $prompt,
            'image_url' => $imageUrl,
            'tags' => $tags,
            'category' => $this->categoryFromContent($title, $prompt, $tags),
            'model' => $this->extractModel($html),
            'published_at' => $this->parseDate($this->arrayString($structuredData, 'datePublished')),
            'modified_at' => $this->parseDate($this->arrayString($structuredData, 'dateModified')) ?? $entry['lastmod'],
        ];
    }

    /**
     * @param  ParsedPrompt  $data
     */
    private function savePrompt(User $user, ?Prompt $existingPrompt, array $data): Prompt
    {
        $thumbnailPath = $existingPrompt?->thumbnail_path;

        if ($data['image_url'] === null && $thumbnailPath === null) {
            throw new RuntimeException('Missing thumbnail image URL.');
        }

        if ($data['image_url'] !== null && ($thumbnailPath === null || $data['image_url'] !== $existingPrompt->source_thumbnail_url)) {
            $thumbnailPath = $this->storeThumbnail($data['image_url'], $data['slug']);
        }

        $attributes = [
            'user_id' => $user->id,
            'generation_mode' => Prompt::GENERATION_MODE_IMPORTED,
            'source_site' => self::SOURCE_SITE,
            'source_slug' => $data['slug'],
            'source_url' => $data['url'],
            'source_thumbnail_url' => $data['image_url'],
            'source_published_at' => $data['published_at'],
            'source_modified_at' => $data['modified_at'],
            'title' => $data['title'],
            'prompt' => $data['prompt'],
            'negative_prompt' => null,
            'thumbnail_prompt' => null,
            'thumbnail_path' => $thumbnailPath,
            'reference_image_path' => null,
            'category' => $data['category'],
            'style_notes' => null,
            'ai_provider' => self::SOURCE_SITE,
            'ai_model' => $data['model'],
            'status' => Prompt::STATUS_COMPLETED,
            'error_message' => null,
            'generated_at' => $data['published_at'] ?? $data['modified_at'] ?? now(),
        ];

        if ($existingPrompt !== null) {
            $existingPrompt->update($attributes);

            return $existingPrompt;
        }

        return Prompt::query()->create([
            ...$attributes,
            'copy_count' => 0,
        ]);
    }

    private function existingPrompt(string $slug): ?Prompt
    {
        return Prompt::query()
            ->where('source_site', self::SOURCE_SITE)
            ->where('source_slug', $slug)
            ->first();
    }

    private function fetchText(string $url): string
    {
        $response = $this->http()->accept('*/*')->get($url);

        if ($response->failed()) {
            throw new RuntimeException("HTTP {$response->status()} returned for {$url}.");
        }

        return $response->body();
    }

    private function storeThumbnail(string $imageUrl, string $slug): string
    {
        $response = $this->http()->accept('image/avif,image/webp,image/png,image/jpeg,image/*')->get($imageUrl);

        if ($response->failed()) {
            throw new RuntimeException("Thumbnail HTTP {$response->status()} returned for {$imageUrl}.");
        }

        $contentType = strtolower(trim(strtok((string) $response->header('Content-Type'), ';') ?: ''));

        if ($contentType !== '' && ! str_starts_with($contentType, 'image/')) {
            throw new RuntimeException("Thumbnail response is not an image for {$imageUrl}.");
        }

        $path = self::STORAGE_DIRECTORY.'/'.Str::slug($slug).'.'.$this->extensionForImage($imageUrl, $contentType);

        Storage::disk('public')->put($path, $response->body());

        return $path;
    }

    private function http(): PendingRequest
    {
        return Http::withHeaders([
            'User-Agent' => 'ImagePromptCRM/1.0 (+https://promptplum.com public sitemap importer)',
        ])
            ->timeout(30)
            ->connectTimeout(10)
            ->retry(3, 500);
    }

    /**
     * @return array<string, mixed>
     */
    private function creativeWorkData(string $html): array
    {
        preg_match_all('~<script type="application/ld\+json">(.*?)</script>~is', $html, $matches);

        foreach ($matches[1] as $json) {
            $decoded = json_decode($json, true);

            if (! is_array($decoded)) {
                continue;
            }

            $graph = $decoded['@graph'] ?? null;

            if (is_array($graph)) {
                foreach ($graph as $node) {
                    if (is_array($node) && ($node['@type'] ?? null) === 'CreativeWork') {
                        return $node;
                    }
                }
            }

            if (($decoded['@type'] ?? null) === 'CreativeWork') {
                return $decoded;
            }
        }

        return [];
    }

    /**
     * @param  array<string, mixed>  $structuredData
     */
    private function extractTitle(string $html, array $structuredData, string $slug): string
    {
        if (preg_match('~<h1\b[^>]*>(.*?)</h1>~is', $html, $match)) {
            $title = $this->cleanInlineText($match[1]);

            if ($title !== '') {
                return $title;
            }
        }

        $title = $this->arrayString($structuredData, 'headline')
            ?? $this->arrayString($structuredData, 'name');

        if ($title !== null) {
            $title = preg_replace('~\s+AI Photo Editing Prompt(?:\s+for\s+.+)?$~i', '', $title) ?? $title;

            return trim($title);
        }

        return Str::of($slug)->replace('-', ' ')->title()->toString();
    }

    private function extractPromptText(string $html): string
    {
        $htmlWithBreaks = preg_replace('~<br\s*/?>~i', "\n", $html) ?? $html;

        if (preg_match('~<p\b[^>]*class="[^"]*\bselect-all\b[^"]*"[^>]*>(.*?)</p>~is', $htmlWithBreaks, $match)) {
            $prompt = $this->cleanPromptText($match[1]);

            if ($prompt !== '') {
                return $prompt;
            }
        }

        $visibleText = $this->cleanInlineText($htmlWithBreaks);

        if (preg_match('~PROMPT\s+Optimized for\s+[^ ]+\s+(?:Save\s+)?(.+?)\s+Copy\s+Like\b~is', $visibleText, $match)) {
            $prompt = $this->cleanInlineText($match[1]);

            if ($prompt !== '') {
                return $prompt;
            }
        }

        throw new RuntimeException('Prompt text could not be extracted.');
    }

    /**
     * @param  array<string, mixed>  $structuredData
     * @return list<string>
     */
    private function extractTags(string $html, array $structuredData): array
    {
        $tags = [];
        $tagStart = strpos($html, '>TAGS<');
        $tagEnd = $tagStart === false ? false : strpos($html, 'You might also like', $tagStart);
        $tagHtml = $tagStart === false ? '' : substr($html, $tagStart, $tagEnd === false ? null : $tagEnd - $tagStart);

        preg_match_all('~<a\b[^>]*href="/library/[^"]+"[^>]*>(.*?)</a>~is', $tagHtml, $matches);

        foreach ($matches[1] as $tagHtmlValue) {
            $tag = ltrim($this->cleanInlineText($tagHtmlValue), '# ');

            if ($tag !== '') {
                $tags[] = $tag;
            }
        }

        $keywords = $structuredData['keywords'] ?? null;

        if (is_array($keywords)) {
            foreach ($keywords as $keyword) {
                if (is_string($keyword) && trim($keyword) !== '') {
                    $tags[] = trim($keyword);
                }
            }
        }

        return array_values(array_unique($tags));
    }

    /**
     * @param  array<string, mixed>  $structuredData
     */
    private function extractImageUrl(string $html, array $structuredData): ?string
    {
        $image = $structuredData['image'] ?? null;

        if (is_array($image)) {
            $url = $image['url'] ?? null;

            if (is_string($url) && trim($url) !== '') {
                return trim($url);
            }
        }

        if (preg_match('~<meta property="og:image" content="([^"]+)"~i', $html, $match)) {
            return html_entity_decode($match[1], ENT_QUOTES | ENT_HTML5, 'UTF-8');
        }

        return null;
    }

    private function extractModel(string $html): ?string
    {
        if (preg_match('~Optimized for\s+([^<\r\n]+)~i', $html, $match)) {
            $model = $this->cleanInlineText($match[1]);

            return $model === '' ? null : $model;
        }

        if (preg_match('~href="/tools/[^"]+">([^<]+)</a>~i', $html, $match)) {
            $model = $this->cleanInlineText($match[1]);

            return $model === '' ? null : $model;
        }

        return null;
    }

    /**
     * @param  list<string>  $tags
     */
    private function categoryFromContent(string $title, string $prompt, array $tags): string
    {
        $tagCategory = $this->categoryFromTags($tags);

        if ($tagCategory !== null) {
            return $tagCategory;
        }

        $haystack = Str::of($title.' '.$prompt.' '.implode(' ', $tags))->lower()->toString();

        return match (true) {
            $this->containsAny($haystack, ['product', 'packaging', 'bottle', 'perfume', 'catalog', 'commercial product']) => Prompt::CATEGORY_PRODUCT,
            $this->containsAny($haystack, ['fashion', 'editorial', 'outfit', 'garment', 'saree', 'streetwear', 'athleisure', 'sportswear', 'runway']) => Prompt::CATEGORY_FASHION,
            $this->containsAny($haystack, ['digital art', 'illustration', 'anime', '3d render', 'painting', 'sketch', 'watercolor', 'cartoon', 'chibi', 'pixar', 'papercraft']) => Prompt::CATEGORY_ART,
            $this->containsAny($haystack, ['lifestyle', 'travel', 'cafe', 'family', 'couple', 'relationship', 'wedding', 'birthday', 'home interior', 'restaurant', 'fitness']) => Prompt::CATEGORY_LIFESTYLE,
            $this->containsAny($haystack, ['portrait', 'headshot', 'selfie', 'profile picture', 'face', 'man', 'woman', 'boy', 'girl', 'person']) => Prompt::CATEGORY_PORTRAIT,
            default => Prompt::CATEGORY_OTHER,
        };
    }

    /**
     * @param  list<string>  $tags
     */
    private function categoryFromTags(array $tags): ?string
    {
        $tagText = Str::of(implode(' ', $tags))->lower()->toString();

        return match (true) {
            $this->containsAny($tagText, ['product', 'branding', 'advertising', 'jewelry']) => Prompt::CATEGORY_PRODUCT,
            $this->containsAny($tagText, ['fashion', 'editorial', 'outfit', 'saree', 'streetwear', 'athleisure', 'sportswear']) => Prompt::CATEGORY_FASHION,
            $this->containsAny($tagText, ['lifestyle', 'travel', 'cafe', 'family', 'couple', 'relationship', 'love', 'wedding', 'birthday', 'sports']) => Prompt::CATEGORY_LIFESTYLE,
            $this->containsAny($tagText, ['digital art', 'illustration', 'anime', '3d', 'painting', 'drawing', 'cartoon', 'pixar', 'chibi', 'papercraft']) => Prompt::CATEGORY_ART,
            $this->containsAny($tagText, ['portrait', 'people', 'men', 'woman', 'boy', 'girl', 'selfie', 'avatar', 'headshot']) => Prompt::CATEGORY_PORTRAIT,
            default => null,
        };
    }

    /**
     * @param  list<string>  $needles
     */
    private function containsAny(string $haystack, array $needles): bool
    {
        foreach ($needles as $needle) {
            if (str_contains($haystack, $needle)) {
                return true;
            }
        }

        return false;
    }

    private function normalizePromptUrl(string $url): ?string
    {
        $url = trim($url);

        if ($url === '') {
            return null;
        }

        if (str_starts_with($url, '/')) {
            $url = self::BASE_URL.$url;
        }

        $path = parse_url($url, PHP_URL_PATH);

        if (! is_string($path) || ! preg_match('~^/prompt/[^/]+/?$~', $path)) {
            return null;
        }

        return self::BASE_URL.'/'.trim($path, '/').'/';
    }

    private function slugFromUrl(string $url): ?string
    {
        $path = parse_url($url, PHP_URL_PATH);

        if (! is_string($path) || ! preg_match('~^/prompt/([^/]+)/?$~', $path, $match)) {
            return null;
        }

        return $match[1];
    }

    private function extensionForImage(string $imageUrl, string $contentType): string
    {
        $extension = match ($contentType) {
            'image/jpeg', 'image/jpg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            'image/avif' => 'avif',
            default => strtolower(pathinfo((string) parse_url($imageUrl, PHP_URL_PATH), PATHINFO_EXTENSION)),
        };

        return in_array($extension, ['jpg', 'jpeg', 'png', 'webp', 'avif'], true)
            ? ($extension === 'jpeg' ? 'jpg' : $extension)
            : 'jpg';
    }

    private function parseDate(?string $value): ?Carbon
    {
        if ($value === null || trim($value) === '') {
            return null;
        }

        try {
            return Carbon::parse($value);
        } catch (Throwable) {
            return null;
        }
    }

    private function loadXml(string $xml): SimpleXMLElement
    {
        $previous = libxml_use_internal_errors(true);
        $sitemap = simplexml_load_string($xml);

        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        if (! $sitemap instanceof SimpleXMLElement) {
            throw new RuntimeException('Invalid sitemap XML.');
        }

        return $sitemap;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function arrayString(array $data, string $key): ?string
    {
        $value = $data[$key] ?? null;

        return is_string($value) && trim($value) !== '' ? trim($value) : null;
    }

    private function cleanInlineText(string $value): string
    {
        $text = html_entity_decode(strip_tags($value), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = preg_replace('~\s+~u', ' ', $text) ?? $text;

        return trim($text);
    }

    private function cleanPromptText(string $value): string
    {
        $text = html_entity_decode(strip_tags($value), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = preg_replace("~\r\n?~", "\n", $text) ?? $text;
        $text = preg_replace("~[ \t]+~", ' ', $text) ?? $text;
        $text = preg_replace("~ *\n *~", "\n", $text) ?? $text;
        $text = preg_replace("~\n{3,}~", "\n\n", $text) ?? $text;

        return trim($text);
    }
}
