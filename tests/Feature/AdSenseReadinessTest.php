<?php

use App\Models\Prompt;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Inertia\Testing\AssertableInertia as Assert;

test('public trust pages render with seo metadata', function (string $path, string $routeName, string $title): void {
    Prompt::factory()->create([
        'category' => Prompt::CATEGORY_PORTRAIT,
    ]);

    $this->get($path)
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('public/info-page')
            ->where('page.title', $title)
            ->where('seo.canonical_url', route($routeName))
            ->where('seo.robots', 'index,follow')
            ->where('seo.open_graph.type', 'website')
            ->where('categoryCounts.portrait', 1)
            ->where('totalCompleted', 1)
            ->has('page.sections'));
})->with([
    'about' => ['/about', 'about', 'A curated archive for copy-ready image prompts'],
    'contact' => ['/contact', 'contact', 'Reach the Prompt Library team'],
    'privacy policy' => ['/privacy-policy', 'privacy-policy', 'Privacy Policy'],
    'terms' => ['/terms', 'terms', 'Terms of Use'],
]);

test('ads txt returns safe setup response when publisher id is missing', function (): void {
    config([
        'adsense.client_id' => null,
    ]);

    $this->get('/ads.txt')
        ->assertSuccessful()
        ->assertHeader('Content-Type', 'text/plain; charset=UTF-8')
        ->assertSee('AdSense publisher ID is not configured yet', false)
        ->assertDontSee('google.com, pub-', false);
});

test('ads txt exposes google publisher authorization when client id is configured', function (): void {
    config([
        'adsense.client_id' => 'ca-pub-1234567890123456',
    ]);

    $this->get('/ads.txt')
        ->assertSuccessful()
        ->assertHeader('Content-Type', 'text/plain; charset=UTF-8')
        ->assertSee('google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0', false);
});

test('prompt pages expose adsense config only when ads are allowed', function (): void {
    config([
        'adsense.enabled' => true,
        'adsense.client_id' => 'ca-pub-1234567890123456',
        'adsense.slots.home' => '1111111111',
        'adsense.slots.library' => '2222222222',
        'adsense.slots.detail' => '3333333333',
    ]);

    $prompt = Prompt::factory()->create([
        'title' => 'Visible prompt for ads',
    ]);

    $this->get('/')
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->where('seo.robots', 'index,follow')
            ->where('adsensePlacement', 'home')
            ->where('adsense.enabled', true)
            ->where('adsense.client_id', 'ca-pub-1234567890123456')
            ->where('adsense.slots.home', '1111111111')
            ->where('adsense.slots.library', '2222222222')
            ->where('adsense.slots.detail', '3333333333'));

    $this->get('/prompts')
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->where('adsensePlacement', 'library')
            ->where('adsense.enabled', true)
            ->where('adsense.slots.library', '2222222222'));

    $this->get("/prompts/{$prompt->id}")
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->where('seo.robots', 'index,follow')
            ->where('adsense.enabled', true)
            ->where('adsense.slots.detail', '3333333333'));

    $this->get('/?search=no-match')
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->where('seo.robots', 'noindex,follow')
            ->where('adsense.enabled', false)
            ->where('adsense.client_id', null));
});

test('admin dashboard does not receive adsense props', function (): void {
    config([
        'adsense.enabled' => true,
        'adsense.client_id' => 'ca-pub-1234567890123456',
    ]);

    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->get('/dashboard')
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->missing('adsense'));
});

test('sitemap and robots keep trust pages crawlable', function (): void {
    Cache::flush();

    $this->get('/sitemap.xml')
        ->assertSuccessful()
        ->assertSee(route('about'), false)
        ->assertSee(route('contact'), false)
        ->assertSee(route('privacy-policy'), false)
        ->assertSee(route('terms'), false);

    $this->get('/robots.txt')
        ->assertSuccessful()
        ->assertSee('Allow: /', false)
        ->assertDontSee('Disallow: /about', false)
        ->assertDontSee('Disallow: /contact', false)
        ->assertDontSee('Disallow: /privacy-policy', false)
        ->assertDontSee('Disallow: /terms', false);
});
