<?php

namespace App\Support;

use App\Models\Prompt;
use Carbon\CarbonInterface;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PromptSeo
{
    public const SITEMAP_CACHE_KEY = 'prompt-library:sitemap:v2';

    /**
     * @return array<string, mixed>
     */
    public function forIndex(Request $request, ?string $category, string $sort, int $filteredTotal): array
    {
        $search = trim((string) $request->string('search'));
        $isCategoryPage = $category !== null && $search === '' && $sort === 'newest';
        $isSearchPage = $search !== '';
        $canonicalRoute = $request->routeIs('prompts.index') ? 'prompts.index' : 'home';
        $canonicalUrl = $this->urlWithQuery(route($canonicalRoute), $isCategoryPage ? ['category' => $category] : []);
        $categoryTitle = $category === null ? null : $this->categoryTitle($category);
        $title = $categoryTitle === null
            ? 'AI Photo Prompt Library'
            : "{$categoryTitle} AI Image Prompts";
        $description = $categoryTitle === null
            ? 'Browse copy-ready AI image prompts with visual thumbnails, style notes, categories, and prompt detail pages for faster creative generation.'
            : "Browse {$categoryTitle} AI image prompts with reference thumbnails, copy-ready text, style notes, and reusable visual direction.";
        $robots = ($isSearchPage || $sort !== 'newest' || $filteredTotal === 0)
            ? 'noindex,follow'
            : 'index,follow';

        return [
            'title' => $title,
            'description' => $description,
            'canonical_url' => $canonicalUrl,
            'robots' => $robots,
            'open_graph' => [
                'type' => 'website',
                'title' => $title,
                'description' => $description,
                'url' => $canonicalUrl,
                'image' => null,
            ],
            'twitter' => [
                'card' => 'summary',
                'title' => $title,
                'description' => $description,
                'image' => null,
            ],
            'structured_data' => [
                $this->websiteSchema(),
                [
                    '@context' => 'https://schema.org',
                    '@type' => 'CollectionPage',
                    'name' => $title,
                    'description' => $description,
                    'url' => $canonicalUrl,
                    'isPartOf' => [
                        '@type' => 'WebSite',
                        'name' => 'Prompt Library',
                        'url' => route('home'),
                    ],
                    'numberOfItems' => $filteredTotal,
                ],
                $this->breadcrumbSchema([
                    ['name' => 'Prompt Library', 'url' => route('home')],
                    ...($categoryTitle === null ? [] : [['name' => $categoryTitle, 'url' => $canonicalUrl]]),
                ]),
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $promptData
     * @return array<string, mixed>
     */
    public function forPrompt(Prompt $prompt, array $promptData): array
    {
        $categoryTitle = is_string($prompt->category) ? $this->categoryTitle($prompt->category) : 'AI Image';
        $title = Str::of($prompt->title)->squish()->append(' AI Image Prompt')->toString();
        $description = Str::of((string) ($promptData['prompt_preview'] ?? $prompt->prompt ?? $prompt->title))
            ->squish()
            ->limit(158)
            ->toString();
        $canonicalUrl = route('prompts.show', $prompt);
        $image = $this->absoluteUrl(
            is_string($promptData['reference_image_url'] ?? null)
                ? $promptData['reference_image_url']
                : ($promptData['thumbnail_url'] ?? null),
        );
        $imageAlt = is_string($promptData['image_alt'] ?? null)
            ? $promptData['image_alt']
            : $this->imageAlt($prompt);

        return [
            'title' => $title,
            'description' => $description,
            'canonical_url' => $canonicalUrl,
            'robots' => 'index,follow',
            'open_graph' => [
                'type' => 'article',
                'title' => $title,
                'description' => $description,
                'url' => $canonicalUrl,
                'image' => $image,
            ],
            'twitter' => [
                'card' => $image === null ? 'summary' : 'summary_large_image',
                'title' => $title,
                'description' => $description,
                'image' => $image,
            ],
            'structured_data' => [
                [
                    '@context' => 'https://schema.org',
                    '@type' => 'CreativeWork',
                    'name' => $prompt->title,
                    'description' => $description,
                    'text' => Str::of((string) $prompt->prompt)->squish()->limit(500)->toString(),
                    'image' => $image,
                    'genre' => $categoryTitle,
                    'datePublished' => $prompt->generated_at?->toAtomString(),
                    'url' => $canonicalUrl,
                ],
                [
                    '@context' => 'https://schema.org',
                    '@type' => 'ImageObject',
                    'name' => $prompt->title,
                    'description' => $imageAlt,
                    'contentUrl' => $image,
                    'url' => $canonicalUrl,
                ],
                $this->breadcrumbSchema([
                    ['name' => 'Prompt Library', 'url' => route('home')],
                    ['name' => $categoryTitle, 'url' => $this->urlWithQuery(route('home'), ['category' => $prompt->category])],
                    ['name' => $prompt->title, 'url' => $canonicalUrl],
                ]),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function forStaticPage(string $title, string $description, string $routeName): array
    {
        $canonicalUrl = route($routeName);

        return [
            'title' => $title,
            'description' => $description,
            'canonical_url' => $canonicalUrl,
            'robots' => 'index,follow',
            'open_graph' => [
                'type' => 'website',
                'title' => $title,
                'description' => $description,
                'url' => $canonicalUrl,
                'image' => null,
            ],
            'twitter' => [
                'card' => 'summary',
                'title' => $title,
                'description' => $description,
                'image' => null,
            ],
            'structured_data' => [
                $this->websiteSchema(),
                [
                    '@context' => 'https://schema.org',
                    '@type' => 'WebPage',
                    'name' => $title,
                    'description' => $description,
                    'url' => $canonicalUrl,
                    'isPartOf' => [
                        '@type' => 'WebSite',
                        'name' => 'Prompt Library',
                        'url' => route('home'),
                    ],
                ],
                $this->breadcrumbSchema([
                    ['name' => 'Prompt Library', 'url' => route('home')],
                    ['name' => $title, 'url' => $canonicalUrl],
                ]),
            ],
        ];
    }

    public function imageAlt(Prompt $prompt): string
    {
        $subject = is_array($prompt->style_notes)
            ? ($prompt->style_notes['subject'] ?? null)
            : null;
        $category = is_string($prompt->category) ? $this->categoryTitle($prompt->category) : 'AI image';

        return Str::of(implode(' ', array_filter([
            $prompt->title,
            "{$category} prompt thumbnail",
            is_string($subject) ? $subject : null,
        ])))
            ->squish()
            ->limit(180, '')
            ->toString();
    }

    public function sitemapXml(): string
    {
        $writer = new \XMLWriter;
        $writer->openMemory();
        $writer->startDocument('1.0', 'UTF-8');
        $writer->startElement('urlset');
        $writer->writeAttribute('xmlns', 'http://www.sitemaps.org/schemas/sitemap/0.9');

        $this->writeUrl($writer, route('home'), now(), 'daily', '1.0');
        $this->writeUrl($writer, route('prompts.index'), now(), 'daily', '0.9');
        $this->writeUrl($writer, route('about'), now(), 'monthly', '0.6');
        $this->writeUrl($writer, route('contact'), now(), 'monthly', '0.6');
        $this->writeUrl($writer, route('privacy-policy'), now(), 'monthly', '0.5');
        $this->writeUrl($writer, route('terms'), now(), 'monthly', '0.5');

        Prompt::query()
            ->completed()
            ->selectRaw('category, max(updated_at) as updated_at')
            ->whereNotNull('category')
            ->groupBy('category')
            ->orderBy('category')
            ->get()
            ->each(function (Prompt $prompt) use ($writer): void {
                $this->writeUrl(
                    $writer,
                    $this->urlWithQuery(route('home'), ['category' => $prompt->category]),
                    $prompt->updated_at,
                    'daily',
                    '0.8',
                );
            });

        Prompt::query()
            ->completed()
            ->select(['id', 'generated_at', 'updated_at'])
            ->latest('generated_at')
            ->latest()
            ->cursor()
            ->each(function (Prompt $prompt) use ($writer): void {
                $this->writeUrl(
                    $writer,
                    route('prompts.show', $prompt),
                    $prompt->updated_at ?? $prompt->generated_at,
                    'weekly',
                    '0.7',
                );
            });

        $writer->endElement();
        $writer->endDocument();

        return (string) $writer->outputMemory();
    }

    private function categoryTitle(string $category): string
    {
        return match ($category) {
            Prompt::CATEGORY_PORTRAIT => 'Portrait',
            Prompt::CATEGORY_PRODUCT => 'Product',
            Prompt::CATEGORY_FASHION => 'Fashion',
            Prompt::CATEGORY_LIFESTYLE => 'Lifestyle',
            Prompt::CATEGORY_ART => 'Art',
            default => 'Other',
        };
    }

    /**
     * @return array<string, mixed>
     */
    private function websiteSchema(): array
    {
        return [
            '@context' => 'https://schema.org',
            '@type' => 'WebSite',
            'name' => 'Prompt Library',
            'url' => route('home'),
            'potentialAction' => [
                '@type' => 'SearchAction',
                'target' => $this->urlWithQuery(route('home'), ['search' => '{search_term_string}']),
                'query-input' => 'required name=search_term_string',
            ],
        ];
    }

    /**
     * @param  list<array{name: string, url: string}>  $items
     * @return array<string, mixed>
     */
    private function breadcrumbSchema(array $items): array
    {
        return [
            '@context' => 'https://schema.org',
            '@type' => 'BreadcrumbList',
            'itemListElement' => array_map(
                fn (array $item, int $index): array => [
                    '@type' => 'ListItem',
                    'position' => $index + 1,
                    'name' => $item['name'],
                    'item' => $item['url'],
                ],
                $items,
                array_keys($items),
            ),
        ];
    }

    /**
     * @param  array<string, mixed>  $query
     */
    private function urlWithQuery(string $url, array $query): string
    {
        $query = array_filter($query, fn (mixed $value): bool => is_scalar($value) && trim((string) $value) !== '');

        return $query === [] ? $url : $url.'?'.http_build_query($query);
    }

    private function absoluteUrl(mixed $url): ?string
    {
        if (! is_string($url) || trim($url) === '') {
            return null;
        }

        if (Str::startsWith($url, ['http://', 'https://'])) {
            return $url;
        }

        return url($url);
    }

    private function writeUrl(\XMLWriter $writer, string $location, ?CarbonInterface $lastModified, string $changeFrequency, string $priority): void
    {
        $writer->startElement('url');
        $writer->writeElement('loc', $location);
        $writer->writeElement('lastmod', ($lastModified ?? now())->toAtomString());
        $writer->writeElement('changefreq', $changeFrequency);
        $writer->writeElement('priority', $priority);
        $writer->endElement();
    }
}
