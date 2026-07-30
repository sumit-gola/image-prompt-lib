<?php

namespace App\Http\Controllers;

use App\Models\Prompt;
use App\Support\PromptSeo;
use Inertia\Inertia;
use Inertia\Response;

class PublicPageController extends Controller
{
    public function about(PromptSeo $seo): Response
    {
        return $this->renderPage($seo, 'about', [
            'eyebrow' => 'About Prompt Library',
            'title' => 'A curated archive for copy-ready image prompts',
            'description' => 'Prompt Library helps creators browse visual prompt references, copy useful prompt language, and adapt it in their preferred AI image tools.',
            'sections' => [
                [
                    'title' => 'What this site provides',
                    'body' => [
                        'The public library shows completed prompts with thumbnails, categories, short previews, full prompt text, and style notes when available.',
                        'Admins generate or import prompt records separately. Public visitors browse, copy, and share saved prompts without generating new AI content on the public page.',
                    ],
                ],
                [
                    'title' => 'Content standards',
                    'body' => [
                        'The library is designed around practical creative references: portraits, product scenes, fashion, lifestyle, art, and other reusable visual directions.',
                        'Prompt records should be reviewed before publishing so public pages remain useful, navigable, and appropriate for a broad audience.',
                    ],
                ],
            ],
        ]);
    }

    public function contact(PromptSeo $seo): Response
    {
        $contactEmail = trim((string) config('mail.from.address'));

        return $this->renderPage($seo, 'contact', [
            'eyebrow' => 'Contact',
            'title' => 'Reach the Prompt Library team',
            'description' => 'Contact the site owner about prompt corrections, moderation, privacy questions, advertising, or account access.',
            'contact_email' => $contactEmail === '' ? null : $contactEmail,
            'sections' => [
                [
                    'title' => 'Support and content requests',
                    'body' => [
                        'Send prompt correction requests, takedown concerns, attribution issues, privacy questions, and advertising questions through the contact email configured for this site.',
                        'Include the prompt URL and a short description of the issue so the site owner can review it quickly.',
                    ],
                ],
                [
                    'title' => 'Administrative access',
                    'body' => [
                        'Prompt upload, generation, import, publish, draft, and delete actions are restricted to authorized admins.',
                        'Public visitors can browse the completed library and copy prompt text, but cannot modify prompt records.',
                    ],
                ],
            ],
        ]);
    }

    public function privacyPolicy(PromptSeo $seo): Response
    {
        return $this->renderPage($seo, 'privacy-policy', [
            'eyebrow' => 'Privacy Policy',
            'title' => 'Privacy Policy',
            'description' => 'How Prompt Library handles account data, uploaded content, analytics signals, cookies, advertising data, and third-party service providers.',
            'sections' => [
                [
                    'title' => 'Information we process',
                    'body' => [
                        'The application may process account details for admins, uploaded reference images, generated prompt records, prompt copy interactions, technical logs, cookies, and similar browser storage.',
                        'Public visitors do not need to create an account to browse completed prompts.',
                    ],
                ],
                [
                    'title' => 'How information is used',
                    'body' => [
                        'Information is used to operate the prompt library, generate and manage prompt records, show public prompt pages, protect the service from abuse, troubleshoot errors, and improve the browsing experience.',
                        'Prompt copy counts are stored as aggregate engagement signals. They are not intended to identify a specific visitor.',
                    ],
                ],
                [
                    'title' => 'AI and infrastructure providers',
                    'body' => [
                        'Admin-supplied images or creative briefs may be sent to configured AI providers to generate prompt text or thumbnails. Only admins should upload content they have permission to process.',
                        'The application may also use hosting, storage, database, queue, email, security, and analytics providers needed to run the service.',
                    ],
                ],
                [
                    'title' => 'Google advertising',
                    'body' => [
                        'When advertising is enabled, Google and its partners may use cookies, web beacons, IP addresses, device identifiers, and similar technologies to serve and measure ads.',
                        'Prompt Library should not intentionally send personally identifiable information to Google ad requests. Visitors can manage browser cookie settings and available Google ad personalization controls.',
                    ],
                ],
                [
                    'title' => 'Your choices',
                    'body' => [
                        'You can avoid logging in for public browsing, use browser controls to manage cookies, and contact the site owner for privacy questions connected to this deployment.',
                        'Admins are responsible for removing unpublished, failed, sensitive, or inappropriate prompt records before they are made public.',
                    ],
                ],
            ],
        ]);
    }

    public function terms(PromptSeo $seo): Response
    {
        return $this->renderPage($seo, 'terms', [
            'eyebrow' => 'Terms',
            'title' => 'Terms of Use',
            'description' => 'Basic usage terms for browsing, copying, sharing, uploading, importing, and publishing Prompt Library content.',
            'sections' => [
                [
                    'title' => 'Using public prompts',
                    'body' => [
                        'Public visitors may browse, copy, and share completed prompt pages. Prompt text is provided as creative direction and may need adaptation for a specific image-generation tool.',
                        'The site does not guarantee that a copied prompt will produce identical results across different models, settings, or user inputs.',
                    ],
                ],
                [
                    'title' => 'Admin uploads and imports',
                    'body' => [
                        'Admins should only upload, generate, import, publish, or republish content they have the right to use and show.',
                        'Admins are responsible for reviewing prompts, thumbnails, source links, and imported content before making records public.',
                    ],
                ],
                [
                    'title' => 'Acceptable use',
                    'body' => [
                        'Do not use the site to publish illegal, harmful, deceptive, infringing, sexually explicit, hateful, violent, or otherwise restricted content.',
                        'Do not manipulate copy counts, scrape the service abusively, interfere with site operation, or attempt to access admin-only functions.',
                    ],
                ],
                [
                    'title' => 'Advertising and third-party services',
                    'body' => [
                        'Public pages may include advertising when the site owner enables ad placements. Ads should not be confused with navigation, prompt copy controls, or site actions.',
                        'The application may depend on third-party AI, hosting, storage, analytics, and advertising services to operate.',
                    ],
                ],
            ],
        ]);
    }

    /**
     * @param  array{
     *     eyebrow: string,
     *     title: string,
     *     description: string,
     *     sections: list<array{title: string, body: list<string>}>,
     *     contact_email?: string|null
     * }  $page
     */
    private function renderPage(PromptSeo $seo, string $routeName, array $page): Response
    {
        $navigation = $this->navigationData();

        return Inertia::render('public/info-page', [
            ...$navigation,
            'page' => $page,
            'seo' => $seo->forStaticPage(
                $page['title'],
                $page['description'],
                $routeName,
            ),
        ]);
    }

    /**
     * @return array{
     *     categories: list<string>,
     *     categoryCounts: array<string, int>,
     *     totalCompleted: int
     * }
     */
    private function navigationData(): array
    {
        $counts = Prompt::query()
            ->completed()
            ->selectRaw('category, count(*) as aggregate')
            ->whereNotNull('category')
            ->groupBy('category')
            ->pluck('aggregate', 'category');

        $categoryCounts = collect(Prompt::CATEGORIES)
            ->mapWithKeys(fn (string $category): array => [
                $category => (int) ($counts[$category] ?? 0),
            ])
            ->all();

        return [
            'categories' => Prompt::CATEGORIES,
            'categoryCounts' => $categoryCounts,
            'totalCompleted' => array_sum($categoryCounts),
        ];
    }
}
