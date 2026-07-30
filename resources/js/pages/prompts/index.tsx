import { Link, router } from '@inertiajs/react';
import {
    ArrowRight,
    CheckCircle2,
    Copy,
    Filter,
    ImageIcon,
    Layers3,
    Search,
    SlidersHorizontal,
    TrendingUp,
    WandSparkles,
    X,
    Zap,
} from 'lucide-react';
import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import PromptController from '@/actions/App/Http/Controllers/PromptController';
import { ResponsiveAdSlot } from '@/components/ads/ad-slot';
import { AdSenseScript } from '@/components/ads/adsense-script';
import { PromptCard } from '@/components/prompts/prompt-card';
import { PromptImagePlaceholder } from '@/components/prompts/prompt-image-placeholder';
import {
    buildPromptQuery,
    categoryAccents,
    categoryBadgeClasses,
    categoryDescriptions,
    categoryLabels,
    formatCount,
    promptLibraryHref,
    sortLabels,
    sortTabs,
} from '@/components/prompts/prompt-library-config';
import type { CategoryFilter } from '@/components/prompts/prompt-library-config';
import { PromptSeoHead } from '@/components/prompts/prompt-seo-head';
import { PublicPromptShell } from '@/components/prompts/public-prompt-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { home } from '@/routes';
import type {
    AdSenseConfig,
    AdSenseSlotKey,
    Paginated,
    PromptCategory,
    PromptCollectionItem,
    PromptLibraryItem,
    PromptModelCount,
    PromptSeoMeta,
    PromptSort,
    PromptTrend,
} from '@/types';

type Props = {
    prompts: Paginated<PromptLibraryItem>;
    categories: PromptCategory[];
    categoryCounts: Record<PromptCategory, number>;
    sorts: PromptSort[];
    suggestedPrompts: PromptLibraryItem[];
    trendingSearches: PromptTrend[];
    collections: PromptCollectionItem[];
    modelCounts: PromptModelCount[];
    totalCompleted: number;
    totalCopies: number;
    newestCategory: PromptCategory | null;
    seo: PromptSeoMeta;
    adsense: AdSenseConfig;
    adsensePlacement: Extract<AdSenseSlotKey, 'home' | 'library'>;
    filters: {
        search: string;
        category: PromptCategory | null;
        sort: PromptSort;
    };
};

export default function PromptLibrary({
    prompts,
    categories,
    categoryCounts,
    sorts,
    suggestedPrompts,
    trendingSearches,
    collections,
    modelCounts,
    totalCompleted,
    totalCopies,
    newestCategory,
    seo,
    adsense,
    adsensePlacement,
    filters,
}: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const category: CategoryFilter = filters.category ?? 'all';
    const sort = filters.sort ?? 'newest';
    const hasFilters = Boolean(filters.search || filters.category);
    const heroPrompts =
        suggestedPrompts.length > 0 ? suggestedPrompts : prompts.data;
    const featuredPrompt = heroPrompts[0] ?? null;

    const applyFilters = (
        nextSearch = search,
        nextCategory: CategoryFilter = category,
        nextSort: PromptSort = sort,
    ): void => {
        router.get(
            home.url({
                query: buildPromptQuery(nextSearch, nextCategory, nextSort),
            }),
            {},
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            },
        );
    };

    const submit = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();
        applyFilters();
    };

    const clearFilters = (): void => {
        setSearch('');
        applyFilters('', 'all', 'newest');
    };

    return (
        <>
            <PromptSeoHead seo={seo} />
            <AdSenseScript config={adsense} />

            <PublicPromptShell
                activeCategory={filters.category}
                activeSearch={filters.search}
                activeSort={sort}
                categories={categories}
                categoryCounts={categoryCounts}
                suggestedPrompts={suggestedPrompts}
                totalCompleted={totalCompleted}
                trends={trendingSearches}
            >
                <div className="mx-auto max-w-[1760px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                    <HeroSection
                        category={category}
                        featuredPrompt={featuredPrompt}
                        heroPrompts={heroPrompts.slice(0, 3)}
                        newestCategory={newestCategory}
                        onSearch={submit}
                        search={search}
                        setSearch={setSearch}
                        sort={sort}
                        totalCompleted={totalCompleted}
                        totalCopies={totalCopies}
                    />

                    <ResponsiveAdSlot
                        adSlot={
                            adsense.slots[adsensePlacement] ??
                            adsense.slots.home ??
                            adsense.slots.library
                        }
                        className="mt-5"
                        config={adsense}
                    />

                    <TrendingSearches
                        activeSort={sort}
                        trends={trendingSearches}
                    />

                    <section className="mt-8" id="discover">
                        <LibraryToolbar
                            categories={categories}
                            category={category}
                            categoryCounts={categoryCounts}
                            clearFilters={clearFilters}
                            hasFilters={hasFilters}
                            promptTotal={prompts.total}
                            search={search}
                            sort={sort}
                            sorts={sorts}
                        />

                        {prompts.data.length > 0 ? (
                            <div className="grid grid-cols-1 gap-4 min-[560px]:grid-cols-2 min-[1800px]:grid-cols-5 lg:grid-cols-3 2xl:grid-cols-4">
                                {prompts.data.map((prompt, index) => (
                                    <PromptCard
                                        key={prompt.id}
                                        featured={
                                            index === 0 &&
                                            prompts.current_page === 1 &&
                                            prompts.data.length > 5
                                        }
                                        prompt={prompt}
                                    />
                                ))}
                            </div>
                        ) : (
                            <EmptyState
                                categories={categories}
                                category={filters.category}
                                categoryCounts={categoryCounts}
                                clearFilters={clearFilters}
                                hasFilters={hasFilters}
                                suggestedPrompts={suggestedPrompts}
                            />
                        )}

                        <Pagination prompts={prompts} />
                    </section>

                    <CollectionsSection
                        activeSort={sort}
                        collections={collections}
                        search={search}
                    />

                    <CreativeDirectionSection
                        categories={categories}
                        category={category}
                        categoryCounts={categoryCounts}
                        search={search}
                        sort={sort}
                        totalCompleted={totalCompleted}
                    />

                    <ModelSection modelCounts={modelCounts} />

                    <HowItWorks />
                </div>
            </PublicPromptShell>
        </>
    );
}

function HeroSection({
    category,
    featuredPrompt,
    heroPrompts,
    newestCategory,
    onSearch,
    search,
    setSearch,
    sort,
    totalCompleted,
    totalCopies,
}: {
    category: CategoryFilter;
    featuredPrompt: PromptLibraryItem | null;
    heroPrompts: PromptLibraryItem[];
    newestCategory: PromptCategory | null;
    onSearch: (event: FormEvent<HTMLFormElement>) => void;
    search: string;
    setSearch: (value: string) => void;
    sort: PromptSort;
    totalCompleted: number;
    totalCopies: number;
}) {
    return (
        <section className="lumen-grain relative isolate overflow-hidden rounded-[1.75rem] border border-lumen-line bg-white/[0.62] shadow-lumen-card backdrop-blur-xl dark:bg-lumen-panel/[0.86]">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgb(255_255_255_/_0.78),rgb(237_233_254_/_0.44)_45%,rgb(219_234_254_/_0.30))] dark:bg-[linear-gradient(135deg,rgb(255_255_255_/_0.04),transparent_46%,rgb(34_211_238_/_0.05))]" />
            <div className="relative z-10 grid gap-7 p-4 sm:p-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(24rem,0.9fr)] lg:p-8 xl:p-10">
                <div className="flex min-w-0 flex-col justify-between gap-8">
                    <div className="space-y-6">
                        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-lumen-primary/[0.35] bg-lumen-primary/[0.12] px-3 py-2 text-xs font-semibold text-lumen-primary-bright uppercase">
                            <span className="motion-safe:lumen-pulse size-2 rounded-full bg-lumen-accent" />
                            Curated and tested AI prompts
                        </div>

                        <div className="max-w-4xl space-y-4">
                            <h1 className="text-4xl leading-[0.96] font-semibold text-balance text-lumen-text sm:text-6xl xl:text-7xl">
                                The creative prompt library for your next
                                impossible image.
                            </h1>
                            <p className="max-w-2xl text-base leading-7 text-lumen-soft sm:text-lg">
                                Discover prompts that turn ideas into
                                extraordinary images. Browse visual references,
                                copy the exact prompt, and adapt it inside your
                                favorite AI image tool.
                            </p>
                        </div>

                        <form
                            onSubmit={onSearch}
                            className="grid max-w-3xl gap-3 rounded-[1.35rem] border border-lumen-line-strong bg-white/[0.68] p-2 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.88),0_18px_60px_rgb(124_58_237_/_0.12)] backdrop-blur sm:grid-cols-[minmax(0,1fr)_auto] dark:bg-white/[0.07] dark:shadow-[inset_0_1px_0_rgb(255_255_255_/_0.08)]"
                        >
                            <div className="relative min-w-0">
                                <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-lumen-accent" />
                                <Input
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    className="h-14 rounded-full border-transparent bg-white/[0.82] pl-12 text-base text-lumen-text shadow-none placeholder:text-lumen-muted focus-visible:ring-lumen-accent/[0.45] dark:bg-lumen-obsidian/[0.72]"
                                    placeholder="Search cinematic portraits, product photography, anime styles..."
                                />
                            </div>
                            <Button
                                type="submit"
                                className="h-14 rounded-full bg-gradient-to-r from-lumen-primary to-lumen-accent px-6 text-base font-semibold text-white shadow-[0_14px_36px_rgb(124_58_237_/_0.24)] hover:brightness-105"
                            >
                                Explore Prompts
                                <ArrowRight />
                            </Button>
                        </form>

                        <div className="flex flex-wrap gap-2">
                            <HeroChip
                                href={promptLibraryHref(search, 'all', sort)}
                                label="All prompts"
                            />
                            {newestCategory && (
                                <HeroChip
                                    href={promptLibraryHref(
                                        search,
                                        newestCategory,
                                        sort,
                                    )}
                                    label={`${categoryLabels[newestCategory]} recently added`}
                                />
                            )}
                            {category !== 'all' && (
                                <HeroChip
                                    href={promptLibraryHref(
                                        search,
                                        category,
                                        sort,
                                    )}
                                    label={`${categoryLabels[category]} board`}
                                />
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <HeroMetric
                            icon={<Layers3 className="size-4" />}
                            label="Prompts"
                            value={formatCount(totalCompleted)}
                        />
                        <HeroMetric
                            icon={<Copy className="size-4" />}
                            label="Copies"
                            value={formatCount(totalCopies)}
                        />
                        <HeroMetric
                            icon={<WandSparkles className="size-4" />}
                            label="Styles"
                            value={formatCount(heroPrompts.length)}
                        />
                    </div>
                </div>

                <HeroImageStack
                    featuredPrompt={featuredPrompt}
                    heroPrompts={heroPrompts}
                />
            </div>
        </section>
    );
}

function HeroImageStack({
    featuredPrompt,
    heroPrompts,
}: {
    featuredPrompt: PromptLibraryItem | null;
    heroPrompts: PromptLibraryItem[];
}) {
    if (!featuredPrompt) {
        return (
            <div className="grid min-h-[26rem] place-items-center rounded-[1.5rem] border border-dashed border-lumen-line bg-white/[0.52] p-8 text-center dark:bg-white/[0.04]">
                <div className="max-w-xs space-y-3">
                    <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-lumen-line bg-lumen-surface text-lumen-accent">
                        <ImageIcon className="size-6" />
                    </span>
                    <p className="text-lg font-semibold text-lumen-text">
                        Prompt images appear here
                    </p>
                    <p className="text-sm leading-6 text-lumen-muted">
                        Upload and complete reference prompts in the admin
                        dashboard to populate the public board.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative min-h-[28rem] lg:min-h-full">
            <div className="absolute inset-4 rounded-[2rem] border border-lumen-primary/[0.24] bg-lumen-primary/[0.10] blur-2xl dark:bg-lumen-primary/[0.06]" />
            <Link
                href={PromptController.show(featuredPrompt.id)}
                className="group absolute inset-y-0 left-0 w-[78%] overflow-hidden rounded-[1.5rem] border border-lumen-line-strong bg-lumen-surface shadow-lumen-card focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lumen-accent"
                prefetch
            >
                {featuredPrompt.reference_image_url ||
                featuredPrompt.thumbnail_url ? (
                    <img
                        src={
                            featuredPrompt.reference_image_url ??
                            featuredPrompt.thumbnail_url ??
                            ''
                        }
                        alt={featuredPrompt.image_alt}
                        width={1200}
                        height={1500}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                        loading="eager"
                        fetchPriority="high"
                        decoding="async"
                    />
                ) : (
                    <PromptImagePlaceholder className="h-full w-full" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/[0.86] via-black/[0.14] to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                    <Badge className="mb-3 rounded-full border-lumen-accent/[0.32] bg-lumen-accent/[0.12] text-lumen-accent">
                        Featured prompt
                    </Badge>
                    <h2 className="line-clamp-2 text-2xl leading-tight font-semibold text-white">
                        {featuredPrompt.title}
                    </h2>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/78">
                        {featuredPrompt.prompt_preview}
                    </p>
                </div>
            </Link>

            {heroPrompts.slice(1, 3).map((prompt, index) => (
                <Link
                    key={prompt.id}
                    href={PromptController.show(prompt.id)}
                    className={`motion-safe:lumen-float group absolute right-0 w-[48%] overflow-hidden rounded-2xl border border-lumen-line bg-lumen-panel shadow-lumen-card transition hover:-translate-y-1 hover:border-lumen-line-strong focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lumen-accent ${index === 0 ? 'top-8' : 'bottom-8 [animation-delay:350ms]'}`}
                    prefetch
                >
                    {prompt.thumbnail_url ? (
                        <img
                            src={prompt.thumbnail_url}
                            alt={prompt.image_alt}
                            width={640}
                            height={800}
                            className="aspect-[4/5] w-full object-cover transition duration-500 group-hover:scale-[1.035]"
                            loading="lazy"
                            decoding="async"
                        />
                    ) : (
                        <PromptImagePlaceholder className="aspect-[4/5] w-full" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/[0.84] via-black/[0.08] to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-3">
                        <p className="line-clamp-2 text-sm leading-5 font-semibold text-white">
                            {prompt.title}
                        </p>
                    </div>
                </Link>
            ))}
        </div>
    );
}

function HeroMetric({
    icon,
    label,
    value,
}: {
    icon: ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div className="min-w-0 rounded-2xl border border-lumen-line bg-white/[0.58] p-3 shadow-sm dark:bg-white/[0.05] dark:shadow-none">
            <div className="mb-2 flex items-center justify-between gap-2 text-lumen-muted">
                <span className="truncate text-xs font-semibold uppercase">
                    {label}
                </span>
                {icon}
            </div>
            <p className="text-2xl leading-none font-semibold text-lumen-text">
                {value}
            </p>
        </div>
    );
}

function HeroChip({
    href,
    label,
}: {
    href: ReturnType<typeof home>;
    label: string;
}) {
    return (
        <Link
            href={href}
            className="rounded-full border border-lumen-line bg-white/[0.62] px-3.5 py-2 text-sm font-semibold text-lumen-soft shadow-sm transition hover:border-lumen-accent/[0.45] hover:bg-white hover:text-lumen-text dark:bg-white/[0.06] dark:shadow-none dark:hover:bg-lumen-accent/[0.10] dark:hover:text-white"
            preserveScroll
            preserveState
        >
            {label}
        </Link>
    );
}

function TrendingSearches({
    activeSort,
    trends,
}: {
    activeSort: PromptSort;
    trends: PromptTrend[];
}) {
    if (trends.length === 0) {
        return null;
    }

    return (
        <section className="mt-5 flex min-w-0 items-center gap-3 overflow-x-auto rounded-[1.25rem] border border-lumen-line bg-white/[0.58] p-2 shadow-sm backdrop-blur dark:bg-lumen-panel/[0.72] dark:shadow-none">
            <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white/[0.70] px-3 py-2 text-xs font-semibold text-lumen-muted uppercase shadow-sm dark:bg-white/[0.06] dark:shadow-none">
                <TrendingUp className="size-4 text-lumen-accent" />
                Trending
            </span>
            {trends.map((trend) => (
                <Link
                    key={`${trend.label}-${trend.category ?? trend.search}`}
                    href={home({
                        query: buildPromptQuery(
                            trend.search,
                            trend.category ?? 'all',
                            activeSort,
                        ),
                    })}
                    className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-lumen-line bg-white/[0.58] px-3.5 text-sm font-semibold text-lumen-soft shadow-sm transition hover:border-lumen-line-strong hover:bg-white hover:text-lumen-text dark:bg-white/[0.04] dark:shadow-none dark:hover:bg-white/[0.08] dark:hover:text-white"
                    preserveScroll
                    preserveState
                >
                    {trend.label}
                    <span className="rounded-full bg-black/[0.05] px-2 py-0.5 text-[11px] text-lumen-muted dark:bg-white/10">
                        {trend.count}
                    </span>
                </Link>
            ))}
        </section>
    );
}

function LibraryToolbar({
    categories,
    category,
    categoryCounts,
    clearFilters,
    hasFilters,
    promptTotal,
    search,
    sort,
    sorts,
}: {
    categories: PromptCategory[];
    category: CategoryFilter;
    categoryCounts: Record<PromptCategory, number>;
    clearFilters: () => void;
    hasFilters: boolean;
    promptTotal: number;
    search: string;
    sort: PromptSort;
    sorts: PromptSort[];
}) {
    return (
        <div className="mb-5 grid gap-4 border-b border-lumen-line pb-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
            <div className="min-w-0 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                    <Badge className="rounded-full border-lumen-line bg-white/[0.70] text-lumen-text shadow-sm dark:bg-white/[0.08] dark:text-white dark:shadow-none">
                        <Filter />
                        Prompt board
                    </Badge>
                    <span className="text-sm text-lumen-soft">
                        {formatCount(promptTotal)} completed prompt
                        {promptTotal === 1 ? '' : 's'} ready to copy
                    </span>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1">
                    <CategoryButton
                        active={category === 'all'}
                        count={Object.values(categoryCounts).reduce(
                            (sum, count) => sum + count,
                            0,
                        )}
                        href={promptLibraryHref(search, 'all', sort)}
                        label="All"
                    />
                    {categories.map((option) => (
                        <CategoryButton
                            key={option}
                            active={category === option}
                            count={categoryCounts[option] ?? 0}
                            href={promptLibraryHref(search, option, sort)}
                            label={categoryLabels[option]}
                        />
                    ))}
                </div>
            </div>

            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center xl:justify-end">
                <SortTabs
                    category={category}
                    search={search}
                    sort={sort}
                    sorts={sorts}
                />
                <div className="flex flex-wrap items-center gap-2">
                    {category !== 'all' && (
                        <Badge
                            variant="outline"
                            className={`rounded-full ${categoryBadgeClasses[category]}`}
                        >
                            {categoryLabels[category]}
                        </Badge>
                    )}
                    {search.trim() !== '' && (
                        <Badge
                            variant="outline"
                            className="max-w-full rounded-full border-lumen-premium/[0.35] bg-lumen-premium/[0.14] text-lumen-premium"
                        >
                            <span className="truncate">{search}</span>
                        </Badge>
                    )}
                    {hasFilters && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={clearFilters}
                            className="rounded-full text-lumen-soft hover:bg-white hover:text-lumen-text dark:hover:bg-white/[0.08] dark:hover:text-white"
                        >
                            <X />
                            Clear
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

function SortTabs({
    category,
    search,
    sort,
    sorts,
}: {
    category: CategoryFilter;
    search: string;
    sort: PromptSort;
    sorts: PromptSort[];
}) {
    const options = sortTabs.filter((option) => sorts.includes(option));

    return (
        <div className="flex w-full gap-1 overflow-x-auto rounded-full border border-lumen-line bg-white/[0.58] p-1 shadow-sm sm:w-fit dark:bg-white/[0.05] dark:shadow-none">
            {options.map((option) => (
                <Link
                    key={option}
                    href={promptLibraryHref(search, category, option)}
                    className={
                        sort === option
                            ? 'flex h-10 shrink-0 items-center gap-2 rounded-full bg-lumen-text px-3.5 text-sm font-semibold text-lumen-obsidian shadow-sm'
                            : 'flex h-10 shrink-0 items-center gap-2 rounded-full px-3.5 text-sm font-semibold text-lumen-soft transition hover:bg-white hover:text-lumen-text dark:hover:bg-white/[0.08] dark:hover:text-white'
                    }
                    preserveScroll
                    preserveState
                >
                    {option === 'popular' ? (
                        <TrendingUp className="size-4" />
                    ) : option === 'most_copied' ? (
                        <Copy className="size-4" />
                    ) : (
                        <SlidersHorizontal className="size-4" />
                    )}
                    {sortLabels[option]}
                </Link>
            ))}
        </div>
    );
}

function CategoryButton({
    active,
    count,
    href,
    label,
}: {
    active: boolean;
    count: number;
    href: ReturnType<typeof home>;
    label: string;
}) {
    return (
        <Link
            href={href}
            className={
                active
                    ? 'inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-lumen-primary/[0.45] bg-gradient-to-r from-lumen-primary to-lumen-accent px-4 text-sm font-semibold text-white shadow-[0_10px_28px_rgb(124_58_237_/_0.20)]'
                    : 'inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-lumen-line bg-white/[0.58] px-4 text-sm font-semibold text-lumen-soft shadow-sm transition hover:border-lumen-line-strong hover:bg-white hover:text-lumen-text dark:bg-white/[0.04] dark:shadow-none dark:hover:bg-white/[0.08] dark:hover:text-white'
            }
            preserveScroll
            preserveState
        >
            {label}
            <span className="rounded-full bg-black/[0.05] px-2 py-0.5 text-[11px] text-lumen-muted dark:bg-white/10">
                {count}
            </span>
        </Link>
    );
}

function EmptyState({
    categories,
    category,
    categoryCounts,
    clearFilters,
    hasFilters,
    suggestedPrompts,
}: {
    categories: PromptCategory[];
    category: PromptCategory | null;
    categoryCounts: Record<PromptCategory, number>;
    clearFilters: () => void;
    hasFilters: boolean;
    suggestedPrompts: PromptLibraryItem[];
}) {
    return (
        <section className="grid gap-8 overflow-hidden rounded-[1.5rem] border border-lumen-line bg-white/[0.64] p-5 text-lumen-text shadow-lumen-card backdrop-blur-xl lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:p-8 dark:bg-lumen-panel/[0.86]">
            <div className="flex min-w-0 flex-col justify-between gap-8">
                <div className="space-y-4">
                    <span className="grid size-14 place-items-center rounded-2xl border border-lumen-line bg-lumen-surface text-lumen-accent shadow-lumen-glow">
                        <ImageIcon className="size-6" />
                    </span>
                    <div className="space-y-2">
                        <h2 className="text-3xl leading-tight font-semibold text-lumen-text">
                            {category
                                ? `No ${categoryLabels[category].toLowerCase()} prompts yet`
                                : 'No prompts found'}
                        </h2>
                        <p className="max-w-md text-sm leading-6 text-lumen-soft">
                            Try a broader search, choose another creative
                            direction, or return to the full board.
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    {hasFilters && (
                        <Button
                            type="button"
                            onClick={clearFilters}
                            className="rounded-full bg-gradient-to-r from-lumen-primary to-lumen-accent text-white shadow-[0_12px_32px_rgb(124_58_237_/_0.22)] hover:brightness-105"
                        >
                            <X />
                            Show all prompts
                        </Button>
                    )}
                    <Button
                        asChild
                        variant="outline"
                        className="rounded-full border-lumen-line bg-white/[0.68] text-lumen-text shadow-sm hover:bg-white hover:text-lumen-text dark:bg-white/[0.06] dark:shadow-none dark:hover:bg-white/[0.12] dark:hover:text-white"
                    >
                        <Link href={PromptController.index()}>
                            Browse library
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="min-w-0 space-y-5">
                {suggestedPrompts.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                        {suggestedPrompts.map((prompt) => (
                            <Link
                                key={prompt.id}
                                href={PromptController.show(prompt.id)}
                                className="group min-w-0 overflow-hidden rounded-2xl border border-lumen-line bg-white/[0.62] shadow-sm transition hover:-translate-y-0.5 hover:border-lumen-line-strong hover:bg-white dark:bg-white/[0.05] dark:shadow-none dark:hover:bg-white/[0.08]"
                                prefetch
                            >
                                {prompt.thumbnail_url ? (
                                    <img
                                        src={prompt.thumbnail_url}
                                        alt={prompt.image_alt}
                                        width={480}
                                        height={600}
                                        className="aspect-[4/5] w-full object-cover transition group-hover:scale-[1.035]"
                                        loading="lazy"
                                        decoding="async"
                                    />
                                ) : (
                                    <PromptImagePlaceholder className="aspect-[4/5] w-full" />
                                )}
                                <div className="p-3">
                                    <p className="line-clamp-2 text-sm leading-5 font-semibold text-lumen-text">
                                        {prompt.title}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="grid min-h-52 place-items-center rounded-2xl border border-dashed border-lumen-line bg-white/[0.52] p-6 text-center text-sm text-lumen-muted dark:bg-white/[0.04]">
                        Completed prompts will appear here after the admin
                        generates them.
                    </div>
                )}

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {categories.map((option) => (
                        <Link
                            key={option}
                            href={promptLibraryHref('', option, 'newest')}
                            className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-lumen-line bg-white/[0.58] px-3 py-2 text-sm font-semibold text-lumen-soft shadow-sm transition hover:bg-white hover:text-lumen-text dark:bg-white/[0.05] dark:shadow-none dark:hover:bg-white/[0.08] dark:hover:text-white"
                            preserveScroll
                            preserveState
                        >
                            <span className="truncate">
                                {categoryLabels[option]}
                            </span>
                            <span className="rounded-full bg-black/[0.05] px-2 py-0.5 text-[11px] text-lumen-muted dark:bg-white/10">
                                {categoryCounts[option] ?? 0}
                            </span>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}

function Pagination({ prompts }: { prompts: Paginated<PromptLibraryItem> }) {
    if (prompts.last_page <= 1) {
        return null;
    }

    return (
        <div className="mt-6 flex flex-col gap-3 border-t border-lumen-line pt-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span className="text-lumen-muted">
                Showing {prompts.from ?? 0}-{prompts.to ?? 0} of {prompts.total}
            </span>
            <div className="grid grid-cols-2 gap-2 sm:flex">
                {prompts.prev_page_url ? (
                    <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="rounded-full border-lumen-line bg-white/[0.68] text-lumen-text shadow-sm hover:bg-white hover:text-lumen-text dark:bg-white/[0.06] dark:shadow-none dark:hover:bg-white/[0.12] dark:hover:text-white"
                    >
                        <Link href={prompts.prev_page_url}>Previous</Link>
                    </Button>
                ) : (
                    <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full border-lumen-line bg-white/[0.46] text-lumen-muted dark:bg-white/[0.04]"
                        disabled
                    >
                        Previous
                    </Button>
                )}
                {prompts.next_page_url ? (
                    <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="rounded-full border-lumen-line bg-white/[0.68] text-lumen-text shadow-sm hover:bg-white hover:text-lumen-text dark:bg-white/[0.06] dark:shadow-none dark:hover:bg-white/[0.12] dark:hover:text-white"
                    >
                        <Link href={prompts.next_page_url}>Next</Link>
                    </Button>
                ) : (
                    <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full border-lumen-line bg-white/[0.46] text-lumen-muted dark:bg-white/[0.04]"
                        disabled
                    >
                        Next
                    </Button>
                )}
            </div>
        </div>
    );
}

function CollectionsSection({
    activeSort,
    collections,
    search,
}: {
    activeSort: PromptSort;
    collections: PromptCollectionItem[];
    search: string;
}) {
    if (collections.length === 0) {
        return null;
    }

    return (
        <section className="mt-12" id="collections">
            <SectionHeader
                eyebrow="Curated boards"
                title="Featured collections"
                description="Category collections group completed prompts around a practical creative direction."
            />

            <div className="grid gap-4 lg:grid-cols-3 2xl:grid-cols-6">
                {collections.map((collection, index) => (
                    <Link
                        key={collection.category}
                        href={promptLibraryHref(
                            search,
                            collection.category,
                            activeSort,
                        )}
                        className={`group relative isolate min-h-72 overflow-hidden rounded-[1.5rem] border border-lumen-line bg-lumen-surface p-4 shadow-lumen-card transition hover:-translate-y-1 hover:border-lumen-line-strong ${index < 2 ? 'lg:col-span-2' : ''}`}
                        preserveScroll
                        preserveState
                    >
                        <div
                            className={`absolute inset-0 bg-gradient-to-br ${categoryAccents[collection.category]}`}
                        />
                        <div className="relative z-10 flex h-full flex-col justify-between gap-6">
                            <div className="grid grid-cols-3 gap-2">
                                {collection.thumbnails
                                    .slice(0, 3)
                                    .map((url) => (
                                        <img
                                            key={url}
                                            src={url}
                                            alt={`${collection.title} collection`}
                                            width={320}
                                            height={400}
                                            className="aspect-[4/5] rounded-2xl object-cover shadow-[0_16px_36px_rgb(15_23_42_/_0.18)] transition group-hover:scale-[1.025] dark:shadow-[0_16px_36px_rgb(0_0_0_/_0.26)]"
                                            loading="lazy"
                                            decoding="async"
                                        />
                                    ))}
                            </div>
                            <div className="space-y-3">
                                <Badge
                                    variant="outline"
                                    className={`rounded-full ${categoryBadgeClasses[collection.category]}`}
                                >
                                    {formatCount(collection.prompt_count)}{' '}
                                    prompt
                                    {collection.prompt_count === 1 ? '' : 's'}
                                </Badge>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-semibold text-lumen-text">
                                        {collection.title}
                                    </h3>
                                    <p className="line-clamp-2 text-sm leading-6 text-lumen-soft">
                                        {collection.description}
                                    </p>
                                </div>
                                <span className="inline-flex items-center gap-2 text-sm font-semibold text-lumen-accent">
                                    Open collection
                                    <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                                </span>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    );
}

function CreativeDirectionSection({
    categories,
    category,
    categoryCounts,
    search,
    sort,
    totalCompleted,
}: {
    categories: PromptCategory[];
    category: CategoryFilter;
    categoryCounts: Record<PromptCategory, number>;
    search: string;
    sort: PromptSort;
    totalCompleted: number;
}) {
    return (
        <section className="mt-12" id="categories">
            <SectionHeader
                eyebrow="Creative direction"
                title="Browse by style"
                description="Move quickly by visual intent instead of digging through admin-style filters."
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
                <DirectionTile
                    active={category === 'all'}
                    count={totalCompleted}
                    href={promptLibraryHref(search, 'all', sort)}
                    label="All"
                />
                {categories.map((option) => (
                    <DirectionTile
                        key={option}
                        active={category === option}
                        count={categoryCounts[option] ?? 0}
                        href={promptLibraryHref(search, option, sort)}
                        label={categoryLabels[option]}
                        description={categoryDescriptions[option]}
                    />
                ))}
            </div>
        </section>
    );
}

function DirectionTile({
    active,
    count,
    description,
    href,
    label,
}: {
    active: boolean;
    count: number;
    description?: string;
    href: ReturnType<typeof home>;
    label: string;
}) {
    return (
        <Link
            href={href}
            className={
                active
                    ? 'group min-w-0 rounded-[1.25rem] border border-lumen-primary/[0.45] bg-gradient-to-br from-lumen-primary to-lumen-accent p-4 text-white shadow-lumen-glow'
                    : 'group min-w-0 rounded-[1.25rem] border border-lumen-line bg-lumen-surface p-4 text-lumen-text shadow-sm transition hover:-translate-y-0.5 hover:border-lumen-line-strong hover:bg-lumen-hover dark:bg-lumen-surface/[0.74] dark:shadow-none dark:hover:bg-lumen-hover/[0.88]'
            }
            preserveScroll
            preserveState
        >
            <div className="mb-4 flex items-center justify-between gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-lumen-line bg-white/[0.70] text-lg font-semibold text-lumen-accent shadow-sm dark:bg-lumen-obsidian dark:shadow-none">
                    {label.slice(0, 1)}
                </span>
                <span className="rounded-full bg-black/[0.05] px-2 py-0.5 text-xs text-lumen-muted dark:bg-white/10">
                    {formatCount(count)}
                </span>
            </div>
            <h3 className="truncate text-base font-semibold">{label}</h3>
            {description && (
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-lumen-muted">
                    {description}
                </p>
            )}
        </Link>
    );
}

function ModelSection({ modelCounts }: { modelCounts: PromptModelCount[] }) {
    return (
        <section className="mt-12" id="models">
            <SectionHeader
                eyebrow="Generation context"
                title="Models in the library"
                description="Model labels come from completed prompt generation records."
            />

            {modelCounts.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {modelCounts.map((model) => (
                        <div
                            key={model.model}
                            className="rounded-[1.25rem] border border-lumen-line bg-lumen-surface p-4 shadow-sm dark:bg-lumen-surface/[0.74] dark:shadow-none"
                        >
                            <div className="mb-5 flex items-center justify-between gap-3">
                                <span className="grid size-11 place-items-center rounded-2xl border border-lumen-accent/[0.25] bg-lumen-accent/[0.10] text-lumen-accent">
                                    <Zap className="size-5" />
                                </span>
                                <span className="rounded-full bg-black/[0.05] px-2 py-0.5 text-xs text-lumen-muted dark:bg-white/10">
                                    {formatCount(model.count)}
                                </span>
                            </div>
                            <h3 className="font-mono text-base font-semibold text-lumen-text">
                                {model.label}
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-lumen-muted">
                                Completed prompt entries using this configured
                                generation model.
                            </p>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="rounded-[1.25rem] border border-dashed border-lumen-line bg-white/[0.52] p-6 text-sm text-lumen-muted dark:bg-white/[0.04]">
                    Model badges will appear after completed prompts include AI
                    model metadata.
                </div>
            )}
        </section>
    );
}

function HowItWorks() {
    const steps = [
        {
            icon: <Search className="size-5" />,
            title: 'Discover a tested prompt',
            body: 'Use search, categories, and sort controls to find a reference-backed visual recipe.',
        },
        {
            icon: <Copy className="size-5" />,
            title: 'Copy and customise it',
            body: 'Copy the prompt in one action, then change the subject or person to match your image idea.',
        },
        {
            icon: <CheckCircle2 className="size-5" />,
            title: 'Generate in your AI tool',
            body: 'Paste the prompt into your preferred image model and keep the visual direction consistent.',
        },
    ];

    return (
        <section className="mt-12 rounded-[1.5rem] border border-lumen-line bg-white/[0.62] p-5 shadow-lumen-card backdrop-blur-xl sm:p-6 lg:p-8 dark:bg-lumen-panel/[0.78]">
            <SectionHeader
                eyebrow="Workflow"
                title="From reference to reusable prompt"
                description="The admin creates the prompt library; public users simply browse, copy, and share."
            />
            <div className="grid gap-3 md:grid-cols-3">
                {steps.map((step) => (
                    <div
                        key={step.title}
                        className="rounded-[1.25rem] border border-lumen-line bg-white/[0.58] p-4 shadow-sm dark:bg-white/[0.045] dark:shadow-none"
                    >
                        <span className="mb-5 grid size-11 place-items-center rounded-2xl border border-lumen-primary/[0.28] bg-lumen-primary/[0.12] text-lumen-primary-bright">
                            {step.icon}
                        </span>
                        <h3 className="text-lg font-semibold text-lumen-text">
                            {step.title}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-lumen-soft">
                            {step.body}
                        </p>
                    </div>
                ))}
            </div>
        </section>
    );
}

function SectionHeader({
    description,
    eyebrow,
    title,
}: {
    description: string;
    eyebrow: string;
    title: string;
}) {
    return (
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-3xl">
                <p className="mb-2 text-xs font-semibold text-lumen-accent uppercase">
                    {eyebrow}
                </p>
                <h2 className="text-3xl font-semibold tracking-normal text-lumen-text">
                    {title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-lumen-soft">
                    {description}
                </p>
            </div>
        </div>
    );
}
