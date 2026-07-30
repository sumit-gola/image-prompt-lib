import { home } from '@/routes';
import type { PromptCategory, PromptSort } from '@/types';

export const categoryLabels: Record<PromptCategory, string> = {
    portrait: 'Portrait',
    product: 'Product',
    fashion: 'Fashion',
    lifestyle: 'Lifestyle',
    art: 'Art',
    other: 'Other',
};

export const categoryDescriptions: Record<PromptCategory, string> = {
    portrait: 'Faces, expressions, headshots, cinematic character portraits.',
    product: 'Commercial product scenes, tabletop lighting, catalog frames.',
    fashion: 'Editorial poses, garment details, runways, and campaign styling.',
    lifestyle: 'Natural scenes, couples, travel, wellness, and daily moments.',
    art: 'Illustration, digital art, painterly direction, and concept worlds.',
    other: 'Experimental references and useful prompts outside core categories.',
};

export const categoryAccents: Record<PromptCategory, string> = {
    portrait:
        'from-lumen-primary/[0.35] via-lumen-premium/[0.18] to-transparent',
    product: 'from-lumen-accent/[0.35] via-emerald-400/[0.16] to-transparent',
    fashion:
        'from-lumen-premium/[0.35] via-lumen-primary/[0.18] to-transparent',
    lifestyle: 'from-amber-300/[0.32] via-lumen-accent/[0.14] to-transparent',
    art: 'from-sky-400/[0.35] via-lumen-primary/[0.18] to-transparent',
    other: 'from-white/[0.24] via-lumen-muted/[0.12] to-transparent',
};

export const categoryBadgeClasses: Record<PromptCategory, string> = {
    portrait:
        'border-lumen-primary/[0.35] bg-lumen-primary/[0.15] text-lumen-primary-bright',
    product:
        'border-lumen-accent/[0.35] bg-lumen-accent/[0.12] text-lumen-accent',
    fashion:
        'border-lumen-premium/[0.35] bg-lumen-premium/[0.14] text-lumen-premium',
    lifestyle: 'border-amber-300/[0.35] bg-amber-300/[0.12] text-amber-200',
    art: 'border-sky-300/[0.35] bg-sky-400/[0.12] text-sky-200',
    other: 'border-white/15 bg-white/10 text-lumen-soft',
};

export const sortLabels: Record<PromptSort, string> = {
    newest: 'Newest',
    popular: 'Popular',
    most_copied: 'Most copied',
    oldest: 'Oldest',
    category: 'Category',
};

export const sortTabs: PromptSort[] = [
    'newest',
    'popular',
    'most_copied',
    'oldest',
    'category',
];

export type CategoryFilter = PromptCategory | 'all';

export function buildPromptQuery(
    search: string,
    category: CategoryFilter,
    sort: PromptSort,
): Record<string, string> {
    const query: Record<string, string> = {
        sort,
    };

    if (search.trim() !== '') {
        query.search = search.trim();
    }

    if (category !== 'all') {
        query.category = category;
    }

    return query;
}

export function promptLibraryHref(
    search: string,
    category: CategoryFilter,
    sort: PromptSort,
): ReturnType<typeof home> {
    return home({
        query: buildPromptQuery(search, category, sort),
    });
}

export function formatGeneratedDate(value: string | null): string {
    if (!value) {
        return 'Recently added';
    }

    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
    }).format(new Date(value));
}

export function formatCount(value: number): string {
    return new Intl.NumberFormat('en-US', {
        notation: value >= 1000 ? 'compact' : 'standard',
    }).format(value);
}
