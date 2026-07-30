<?php

use App\Models\Prompt;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

test('promptplum importer stores completed prompts with thumbnails', function (): void {
    Storage::fake('public');

    $user = User::factory()->admin()->create();
    fakePromptPlumImportResponses([
        [
            'slug' => 'retro-vintage',
            'image' => 'https://img.promptplum.com/promptImages/retro-vintage.webp',
            'title' => 'Retro Vintage',
            'prompt' => 'Create a cinematic portrait with warm 90s film grain and soft studio lighting.',
            'tags' => ['Portraits', 'Men', 'Retro Vintage'],
            'model' => 'Gemini',
        ],
    ]);

    $this->artisan('prompts:import-promptplum', [
        '--user' => (string) $user->id,
        '--limit' => '1',
        '--delay' => '0',
    ])->assertExitCode(0);

    $prompt = Prompt::query()->firstOrFail();

    expect($prompt)
        ->user_id->toBe($user->id)
        ->generation_mode->toBe(Prompt::GENERATION_MODE_IMPORTED)
        ->source_site->toBe('promptplum')
        ->source_slug->toBe('retro-vintage')
        ->source_url->toBe('https://promptplum.com/prompt/retro-vintage/')
        ->source_thumbnail_url->toBe('https://img.promptplum.com/promptImages/retro-vintage.webp')
        ->title->toBe('Retro Vintage')
        ->prompt->toBe('Create a cinematic portrait with warm 90s film grain and soft studio lighting.')
        ->category->toBe(Prompt::CATEGORY_PORTRAIT)
        ->ai_provider->toBe('promptplum')
        ->ai_model->toBe('Gemini')
        ->status->toBe(Prompt::STATUS_COMPLETED)
        ->copy_count->toBe(0);

    Storage::disk('public')->assertExists('prompts/imports/promptplum/retro-vintage.webp');
});

test('promptplum importer skips existing prompts by source slug', function (): void {
    Storage::fake('public');

    $user = User::factory()->admin()->create();
    fakePromptPlumImportResponses([
        [
            'slug' => 'retro-vintage',
            'image' => 'https://img.promptplum.com/promptImages/retro-vintage.webp',
            'title' => 'Retro Vintage',
            'prompt' => 'Create a cinematic portrait with warm 90s film grain and soft studio lighting.',
            'tags' => ['Portraits'],
            'model' => 'Gemini',
        ],
    ]);

    $this->artisan('prompts:import-promptplum', [
        '--user' => (string) $user->id,
        '--delay' => '0',
    ])->assertExitCode(0);

    $this->artisan('prompts:import-promptplum', [
        '--user' => (string) $user->id,
        '--delay' => '0',
    ])->assertExitCode(0);

    expect(Prompt::query()->count())->toBe(1);
});

test('promptplum importer force updates existing prompt without resetting copy count', function (): void {
    Storage::fake('public');
    Storage::disk('public')->put('prompts/imports/promptplum/retro-vintage.webp', 'old image');

    $user = User::factory()->admin()->create();
    $existing = Prompt::factory()->imported()->create([
        'user_id' => $user->id,
        'source_slug' => 'retro-vintage',
        'source_url' => 'https://promptplum.com/prompt/retro-vintage/',
        'source_thumbnail_url' => 'https://img.promptplum.com/promptImages/retro-vintage.webp',
        'thumbnail_path' => 'prompts/imports/promptplum/retro-vintage.webp',
        'copy_count' => 12,
        'title' => 'Old title',
        'prompt' => 'Old prompt text.',
    ]);

    fakePromptPlumImportResponses([
        [
            'slug' => 'retro-vintage',
            'image' => 'https://img.promptplum.com/promptImages/retro-vintage.webp',
            'title' => 'Updated Retro Vintage',
            'prompt' => 'Updated prompt text for a cinematic retro portrait.',
            'tags' => ['Fashion', 'Portraits'],
            'model' => 'Gemini',
        ],
    ]);

    $this->artisan('prompts:import-promptplum', [
        '--user' => (string) $user->id,
        '--delay' => '0',
        '--force' => true,
    ])->assertExitCode(0);

    expect($existing->refresh())
        ->title->toBe('Updated Retro Vintage')
        ->prompt->toBe('Updated prompt text for a cinematic retro portrait.')
        ->category->toBe(Prompt::CATEGORY_FASHION)
        ->copy_count->toBe(12);
});

test('promptplum importer dry run does not save prompts or thumbnails', function (): void {
    Storage::fake('public');

    $user = User::factory()->admin()->create();
    fakePromptPlumImportResponses([
        [
            'slug' => 'retro-vintage',
            'image' => 'https://img.promptplum.com/promptImages/retro-vintage.webp',
            'title' => 'Retro Vintage',
            'prompt' => 'Create a cinematic portrait with warm 90s film grain and soft studio lighting.',
            'tags' => ['Portraits'],
            'model' => 'Gemini',
        ],
    ]);

    $this->artisan('prompts:import-promptplum', [
        '--user' => (string) $user->id,
        '--limit' => '1',
        '--delay' => '0',
        '--dry-run' => true,
    ])->assertExitCode(0);

    expect(Prompt::query()->count())->toBe(0)
        ->and(Storage::disk('public')->allFiles())->toBe([]);
});

/**
 * @param  list<array{slug: string, image: string, title: string, prompt: string, tags: list<string>, model: string}>  $prompts
 */
function fakePromptPlumImportResponses(array $prompts): void
{
    Http::preventStrayRequests();

    $responses = [
        'https://promptplum.com/sitemap.xml' => Http::response(promptPlumSitemapIndex(), 200, [
            'Content-Type' => 'application/xml',
        ]),
        'https://promptplum.com/ai_prompt-sitemap.xml' => Http::response(promptPlumPromptSitemap($prompts), 200, [
            'Content-Type' => 'application/xml',
        ]),
        'https://img.promptplum.com/*' => Http::response('fake image contents', 200, [
            'Content-Type' => 'image/webp',
        ]),
    ];

    foreach ($prompts as $prompt) {
        $responses["https://promptplum.com/prompt/{$prompt['slug']}/"] = Http::response(
            promptPlumDetailHtml($prompt),
            200,
            ['Content-Type' => 'text/html'],
        );
    }

    Http::fake($responses);
}

function promptPlumSitemapIndex(): string
{
    return <<<'XML'
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <sitemap>
        <loc>https://promptplum.com/ai_prompt-sitemap.xml</loc>
    </sitemap>
</sitemapindex>
XML;
}

/**
 * @param  list<array{slug: string, image: string, title: string, prompt: string, tags: list<string>, model: string}>  $prompts
 */
function promptPlumPromptSitemap(array $prompts): string
{
    $urls = array_map(function (array $prompt): string {
        return sprintf(
            '<url><loc>https://promptplum.com/prompt/%s/</loc><image:image><image:loc>%s</image:loc></image:image><lastmod>2026-06-02T10:17:28.437Z</lastmod></url>',
            e($prompt['slug']),
            e($prompt['image']),
        );
    }, $prompts);

    return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">'.implode('', $urls).'</urlset>';
}

/**
 * @param  array{slug: string, image: string, title: string, prompt: string, tags: list<string>, model: string}  $prompt
 */
function promptPlumDetailHtml(array $prompt): string
{
    $tagLinks = array_map(
        fn (string $tag): string => '<a href="/library/'.e(Str::slug($tag)).'/"><span>#</span>'.e($tag).'</a>',
        $prompt['tags'],
    );
    $json = json_encode([
        '@context' => 'https://schema.org',
        '@graph' => [
            [
                '@type' => 'CreativeWork',
                'headline' => $prompt['title'].' AI Photo Editing Prompt for Gemini',
                'name' => $prompt['title'].' AI Photo Editing Prompt for Gemini',
                'image' => [
                    '@type' => 'ImageObject',
                    'url' => $prompt['image'],
                ],
                'datePublished' => '2025-11-23T21:14:10.000Z',
                'dateModified' => '2026-06-02T10:17:28.437Z',
                'keywords' => $prompt['tags'],
            ],
        ],
    ], JSON_THROW_ON_ERROR);

    return '<!doctype html><html><head><script type="application/ld+json">'.$json.'</script></head><body>'
        .'<h1>'.e($prompt['title']).'</h1>'
        .'<h2>PROMPT</h2>'
        .'<div>Optimized for '.e($prompt['model']).'</div>'
        .'<p class="text whitespace-pre-wrap select-all">'.e($prompt['prompt']).'</p>'
        .'<button>Copy</button><button>Like 10</button>'
        .'<h3>MODEL OR TOOL</h3><a href="/tools/'.e(Str::slug($prompt['model'])).'/">'.e($prompt['model']).'</a>'
        .'<h3>TAGS</h3><div>'.implode('', $tagLinks).'</div>'
        .'<h2>You might also like</h2>'
        .'</body></html>';
}
