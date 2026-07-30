<?php

namespace App\Http\Controllers;

use App\Support\AdSense;
use App\Support\PromptSeo;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Cache;

class SeoController extends Controller
{
    public function sitemap(PromptSeo $seo): Response
    {
        $xml = Cache::flexible(
            PromptSeo::SITEMAP_CACHE_KEY,
            [300, 900],
            fn (): string => $seo->sitemapXml(),
        );

        return response($xml, 200, [
            'Content-Type' => 'application/xml; charset=UTF-8',
            'Cache-Control' => 'public, max-age=300, stale-while-revalidate=600',
        ]);
    }

    public function robots(): Response
    {
        $content = implode("\n", [
            'User-agent: *',
            'Disallow: /admin',
            'Disallow: /dashboard',
            'Disallow: /login',
            'Disallow: /register',
            'Disallow: /settings',
            'Allow: /',
            'Sitemap: '.route('seo.sitemap'),
            '',
        ]);

        return response($content, 200, [
            'Content-Type' => 'text/plain; charset=UTF-8',
            'Cache-Control' => 'public, max-age=3600',
        ]);
    }

    public function adsTxt(AdSense $adSense): Response
    {
        $content = $adSense->adsTxtLine()
            ?? '# AdSense publisher ID is not configured yet.';

        return response($content."\n", 200, [
            'Content-Type' => 'text/plain; charset=UTF-8',
            'Cache-Control' => 'public, max-age=3600',
        ]);
    }
}
