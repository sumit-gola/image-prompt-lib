import { Link, router, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    Command,
    Grid2X2,
    LayoutDashboard,
    LogIn,
    Menu,
    Monitor,
    Moon,
    Search,
    Sparkles,
    Sun,
    UserCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import PromptController from '@/actions/App/Http/Controllers/PromptController';
import { PromptImagePlaceholder } from '@/components/prompts/prompt-image-placeholder';
import {
    buildPromptQuery,
    categoryLabels,
    promptLibraryHref,
} from '@/components/prompts/prompt-library-config';
import type { CategoryFilter } from '@/components/prompts/prompt-library-config';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import type { Appearance } from '@/hooks/use-appearance';
import { useAppearance } from '@/hooks/use-appearance';
import { cn } from '@/lib/utils';
import { dashboard, home, login } from '@/routes';
import type {
    PromptCategory,
    PromptLibraryItem,
    PromptSort,
    PromptTrend,
    User,
} from '@/types';

type Props = {
    activeCategory?: PromptCategory | null;
    activeSearch?: string;
    activeSort?: PromptSort;
    categories: PromptCategory[];
    categoryCounts?: Record<PromptCategory, number>;
    children: ReactNode;
    suggestedPrompts?: PromptLibraryItem[];
    totalCompleted?: number;
    trends?: PromptTrend[];
};

const navigationItems = [
    { label: 'Discover', href: home() },
    { label: 'Collections', href: `${home.url()}#collections` },
    { label: 'Categories', href: `${home.url()}#categories` },
    { label: 'AI Models', href: `${home.url()}#models` },
];

const themeOptions: { value: Appearance; label: string; icon: LucideIcon }[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
];

export function PublicPromptShell({
    activeCategory = null,
    activeSearch = '',
    activeSort = 'newest',
    categories,
    categoryCounts = {} as Record<PromptCategory, number>,
    children,
    suggestedPrompts = [],
    totalCompleted = 0,
    trends = [],
}: Props) {
    const { auth } = usePage<{ auth: { user: User | null } }>().props;
    const [searchOpen, setSearchOpen] = useState(false);
    const [dialogSearch, setDialogSearch] = useState(activeSearch);
    const categoryFilter: CategoryFilter = activeCategory ?? 'all';
    const previewPrompts = suggestedPrompts.filter((prompt) => {
        if (dialogSearch.trim() === '') {
            return true;
        }

        const query = dialogSearch.toLowerCase();

        return [
            prompt.title,
            prompt.prompt_preview,
            prompt.category ? categoryLabels[prompt.category] : '',
        ]
            .join(' ')
            .toLowerCase()
            .includes(query);
    });

    useEffect(() => {
        const openSearch = (event: KeyboardEvent): void => {
            if (
                (event.metaKey || event.ctrlKey) &&
                event.key.toLowerCase() === 'k'
            ) {
                event.preventDefault();
                setDialogSearch(activeSearch);
                setSearchOpen(true);
            }
        };

        window.addEventListener('keydown', openSearch);

        return () => window.removeEventListener('keydown', openSearch);
    }, [activeSearch]);

    const submitSearch = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();
        router.get(
            home.url({
                query: buildPromptQuery(
                    dialogSearch,
                    categoryFilter,
                    activeSort,
                ),
            }),
            {},
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            },
        );
        setSearchOpen(false);
    };

    return (
        <div className="min-h-screen overflow-x-hidden bg-lumen-obsidian text-lumen-text selection:bg-lumen-primary/[0.35] selection:text-white">
            <div className="pointer-events-none fixed inset-0 z-0 opacity-90 dark:opacity-45">
                <div className="lumen-grid absolute inset-0" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_12%_4%,rgb(219_234_254_/_0.92),transparent_32%),radial-gradient(ellipse_at_82%_0%,rgb(237_233_254_/_0.82),transparent_34%),radial-gradient(ellipse_at_78%_78%,rgb(252_231_243_/_0.72),transparent_38%)] dark:bg-[radial-gradient(ellipse_at_top_left,rgb(139_92_246_/_0.18),transparent_38%),radial-gradient(ellipse_at_bottom_right,rgb(34_211_238_/_0.12),transparent_35%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(255_255_255_/_0.54),transparent_35%,rgb(248_250_252_/_0.78))] dark:bg-none" />
            </div>

            <header className="sticky top-0 z-50 border-b border-lumen-line bg-white/[0.78] shadow-[0_16px_50px_rgb(15_23_42_/_0.08)] backdrop-blur-2xl supports-[backdrop-filter]:bg-white/[0.66] dark:bg-lumen-obsidian/[0.82] dark:shadow-[0_16px_50px_rgb(0_0_0_/_0.26)] dark:supports-[backdrop-filter]:bg-lumen-obsidian/[0.72]">
                <div className="mx-auto max-w-[1760px] px-4 py-3 sm:px-6 lg:px-8">
                    <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 xl:grid-cols-[auto_auto_minmax(24rem,1fr)_auto]">
                        <BrandMark compact={false} />

                        <nav
                            aria-label="Primary navigation"
                            className="hidden min-w-0 items-center gap-1 rounded-full border border-lumen-line bg-white/[0.62] p-1 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.76)] backdrop-blur xl:flex dark:bg-white/[0.04] dark:shadow-none"
                        >
                            {navigationItems.map((item) =>
                                typeof item.href === 'string' ? (
                                    <a
                                        key={item.label}
                                        href={item.href}
                                        className="rounded-full px-3.5 py-2 text-sm font-medium text-lumen-soft transition hover:bg-white hover:text-lumen-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumen-accent dark:hover:bg-white/[0.08] dark:hover:text-white"
                                    >
                                        {item.label}
                                    </a>
                                ) : (
                                    <Link
                                        key={item.label}
                                        href={item.href}
                                        className="rounded-full px-3.5 py-2 text-sm font-medium text-lumen-soft transition hover:bg-white hover:text-lumen-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumen-accent dark:hover:bg-white/[0.08] dark:hover:text-white"
                                        preserveScroll
                                    >
                                        {item.label}
                                    </Link>
                                ),
                            )}
                        </nav>

                        <Dialog
                            open={searchOpen}
                            onOpenChange={(open) => {
                                setSearchOpen(open);

                                if (open) {
                                    setDialogSearch(activeSearch);
                                }
                            }}
                        >
                            <DialogTrigger asChild>
                                <button
                                    type="button"
                                    className="hidden h-12 min-w-0 items-center justify-between gap-3 rounded-full border border-lumen-line bg-white/[0.70] px-4 text-left text-sm text-lumen-muted shadow-[inset_0_1px_0_rgb(255_255_255_/_0.85),0_12px_36px_rgb(15_23_42_/_0.06)] transition hover:border-lumen-line-strong hover:bg-white hover:text-lumen-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumen-accent md:flex dark:bg-white/[0.06] dark:shadow-[inset_0_1px_0_rgb(255_255_255_/_0.06)] dark:hover:bg-white/[0.09]"
                                >
                                    <span className="flex min-w-0 items-center gap-3">
                                        <Search className="size-4 shrink-0 text-lumen-accent" />
                                        <span className="truncate">
                                            Search prompts, styles, creators...
                                        </span>
                                    </span>
                                    <kbd className="hidden rounded-md border border-lumen-line bg-lumen-panel px-2 py-1 font-mono text-[11px] text-lumen-soft lg:inline-flex">
                                        Ctrl K
                                    </kbd>
                                </button>
                            </DialogTrigger>
                            <SearchDialog
                                activeCategory={categoryFilter}
                                activeSort={activeSort}
                                dialogSearch={dialogSearch}
                                previewPrompts={previewPrompts}
                                setDialogSearch={setDialogSearch}
                                submitSearch={submitSearch}
                                trends={trends}
                            />
                        </Dialog>

                        <div className="flex min-w-0 items-center justify-end gap-2">
                            <ThemeToggle />

                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-11 w-11 shrink-0 rounded-full border-lumen-line bg-white/[0.72] text-lumen-text shadow-sm hover:bg-white hover:text-lumen-text md:hidden dark:bg-white/[0.06] dark:hover:bg-white/[0.12] dark:hover:text-white"
                                onClick={() => setSearchOpen(true)}
                                title="Search prompts"
                            >
                                <Search />
                                <span className="sr-only">Search prompts</span>
                            </Button>

                            <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="hidden h-11 rounded-full border-lumen-line bg-white/[0.72] text-lumen-text shadow-sm hover:bg-white hover:text-lumen-text lg:inline-flex dark:bg-white/[0.06] dark:hover:bg-white/[0.12] dark:hover:text-white"
                            >
                                <Link href={PromptController.index()}>
                                    <Grid2X2 />
                                    Prompt Library
                                </Link>
                            </Button>
                            <Button
                                asChild
                                size="sm"
                                className="hidden h-11 rounded-full bg-gradient-to-r from-lumen-primary to-lumen-accent px-4 text-white shadow-[0_12px_32px_rgb(124_58_237_/_0.22)] hover:brightness-105 lg:inline-flex dark:shadow-[0_12px_32px_rgb(247_248_252_/_0.15)]"
                            >
                                <Link href={auth.user ? dashboard() : login()}>
                                    {auth.user ? (
                                        <>
                                            <LayoutDashboard />
                                            Dashboard
                                        </>
                                    ) : (
                                        <>
                                            <LogIn />
                                            Login
                                        </>
                                    )}
                                </Link>
                            </Button>

                            <Sheet>
                                <SheetTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-11 w-11 shrink-0 rounded-full border-lumen-line bg-white/[0.72] text-lumen-text shadow-sm hover:bg-white hover:text-lumen-text xl:hidden dark:bg-white/[0.06] dark:hover:bg-white/[0.12] dark:hover:text-white"
                                        title="Open navigation"
                                    >
                                        <Menu />
                                        <span className="sr-only">
                                            Open navigation
                                        </span>
                                    </Button>
                                </SheetTrigger>
                                <MobileNavigation
                                    activeCategory={categoryFilter}
                                    activeSearch={activeSearch}
                                    activeSort={activeSort}
                                    authUser={auth.user}
                                    categories={categories}
                                    categoryCounts={categoryCounts}
                                    totalCompleted={totalCompleted}
                                />
                            </Sheet>
                        </div>
                    </div>

                    <div className="mt-3 flex gap-2 overflow-x-auto pb-1 xl:hidden">
                        <CategoryPill
                            active={categoryFilter === 'all'}
                            count={totalCompleted}
                            href={promptLibraryHref(
                                activeSearch,
                                'all',
                                activeSort,
                            )}
                            label="All"
                        />
                        {categories.map((category) => (
                            <CategoryPill
                                key={category}
                                active={categoryFilter === category}
                                count={categoryCounts[category] ?? 0}
                                href={promptLibraryHref(
                                    activeSearch,
                                    category,
                                    activeSort,
                                )}
                                label={categoryLabels[category]}
                            />
                        ))}
                    </div>
                </div>
                <div className="lumen-scanline h-px w-full opacity-80" />
            </header>

            <main className="relative z-10">{children}</main>

            <footer className="relative z-10 border-t border-lumen-line bg-white/[0.62] backdrop-blur-xl dark:bg-lumen-panel/[0.72]">
                <div className="mx-auto grid max-w-[1760px] gap-6 px-4 py-8 sm:px-6 md:grid-cols-[minmax(0,1fr)_auto] lg:px-8">
                    <div className="max-w-xl space-y-3">
                        <BrandMark compact />
                        <p className="text-sm leading-6 text-lumen-soft">
                            Discover prompts that turn ideas into extraordinary
                            images.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-lumen-muted md:justify-end">
                        <Link
                            href={home()}
                            className="rounded-full px-3 py-2 transition hover:bg-white hover:text-lumen-text dark:hover:bg-white/[0.08] dark:hover:text-white"
                        >
                            Discover
                        </Link>
                        <Link
                            href={PromptController.index()}
                            className="rounded-full px-3 py-2 transition hover:bg-white hover:text-lumen-text dark:hover:bg-white/[0.08] dark:hover:text-white"
                        >
                            Prompts
                        </Link>
                        <Link
                            href={auth.user ? dashboard() : login()}
                            className="rounded-full px-3 py-2 transition hover:bg-white hover:text-lumen-text dark:hover:bg-white/[0.08] dark:hover:text-white"
                        >
                            {auth.user ? 'Dashboard' : 'Login'}
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}

function BrandMark({ compact }: { compact: boolean }) {
    return (
        <Link
            href={home()}
            className="flex min-w-0 items-center gap-3 rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lumen-accent"
        >
            <span className="relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-2xl border border-lumen-line-strong bg-lumen-surface text-lumen-text shadow-lumen-glow">
                <span className="absolute inset-0 bg-[conic-gradient(from_120deg,rgb(139_92_246_/_0.65),rgb(34_211_238_/_0.45),rgb(244_114_182_/_0.5),rgb(139_92_246_/_0.65))] opacity-55" />
                <Sparkles className="relative size-5" />
            </span>
            {!compact && (
                <span className="hidden min-w-0 sm:block">
                    <span className="block truncate text-base leading-5 font-semibold text-lumen-text">
                        Prompt Library
                    </span>
                    <span className="block truncate text-[11px] font-semibold text-lumen-muted uppercase">
                        Creative prompt archive
                    </span>
                </span>
            )}
        </Link>
    );
}

function ThemeToggle({ mobile = false }: { mobile?: boolean }) {
    const { appearance, updateAppearance } = useAppearance();

    return (
        <div
            aria-label="Choose color theme"
            className={cn(
                'rounded-full border border-lumen-line bg-white/[0.64] p-1 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.82),0_12px_32px_rgb(15_23_42_/_0.06)] backdrop-blur dark:bg-white/[0.05] dark:shadow-none',
                mobile
                    ? 'grid grid-cols-3 gap-1'
                    : 'hidden shrink-0 items-center gap-1 lg:inline-flex',
            )}
            role="group"
        >
            {themeOptions.map(({ icon: Icon, label, value }) => (
                <button
                    key={value}
                    type="button"
                    aria-pressed={appearance === value}
                    title={`${label} theme`}
                    onClick={() => updateAppearance(value)}
                    className={cn(
                        'inline-flex h-9 min-w-0 items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumen-accent',
                        appearance === value
                            ? 'bg-lumen-text text-lumen-obsidian shadow-sm'
                            : 'text-lumen-muted hover:bg-white hover:text-lumen-text dark:hover:bg-white/[0.08] dark:hover:text-white',
                        mobile ? 'w-full' : '',
                    )}
                >
                    <Icon className="size-4 shrink-0" />
                    <span
                        className={mobile ? 'inline' : 'sr-only xl:not-sr-only'}
                    >
                        {label}
                    </span>
                </button>
            ))}
        </div>
    );
}

function SearchDialog({
    activeCategory,
    activeSort,
    dialogSearch,
    previewPrompts,
    setDialogSearch,
    submitSearch,
    trends,
}: {
    activeCategory: CategoryFilter;
    activeSort: PromptSort;
    dialogSearch: string;
    previewPrompts: PromptLibraryItem[];
    setDialogSearch: (value: string) => void;
    submitSearch: (event: FormEvent<HTMLFormElement>) => void;
    trends: PromptTrend[];
}) {
    return (
        <DialogContent className="max-h-[min(90vh,46rem)] overflow-hidden border-lumen-line-strong bg-white/[0.92] p-0 text-lumen-text shadow-lumen-card backdrop-blur-2xl sm:max-w-3xl dark:bg-lumen-panel/[0.96]">
            <DialogHeader className="border-b border-lumen-line p-4 text-left sm:p-5">
                <DialogTitle className="flex items-center gap-2 text-lg">
                    <Command className="size-5 text-lumen-accent" />
                    Search prompt library
                </DialogTitle>
                <DialogDescription className="text-lumen-soft">
                    Find reusable visual recipes by category, style, title, or
                    prompt language.
                </DialogDescription>
            </DialogHeader>

            <form
                onSubmit={submitSearch}
                className="border-b border-lumen-line p-4 sm:p-5"
            >
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <div className="relative min-w-0">
                        <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-lumen-accent" />
                        <Input
                            value={dialogSearch}
                            onChange={(event) =>
                                setDialogSearch(event.target.value)
                            }
                            autoFocus
                            className="h-12 rounded-full border-lumen-line bg-white/[0.72] pl-11 text-lumen-text shadow-sm placeholder:text-lumen-muted focus-visible:ring-lumen-accent/[0.40] dark:bg-white/[0.06] dark:shadow-none"
                            placeholder="Search cinematic portraits, product photos, anime styles..."
                        />
                    </div>
                    <Button
                        type="submit"
                        className="h-12 rounded-full bg-lumen-primary px-5 text-white hover:bg-lumen-primary-bright"
                    >
                        Search
                        <ArrowRight />
                    </Button>
                </div>
            </form>

            <div className="max-h-[28rem] overflow-y-auto p-4 sm:p-5">
                {trends.length > 0 && (
                    <div className="mb-5">
                        <p className="mb-2 text-xs font-semibold text-lumen-muted uppercase">
                            Trending searches
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {trends.map((trend) => (
                                <Link
                                    key={`${trend.label}-${trend.category ?? trend.search}`}
                                    href={home({
                                        query: buildPromptQuery(
                                            trend.search,
                                            trend.category ?? activeCategory,
                                            activeSort,
                                        ),
                                    })}
                                    className="rounded-full border border-lumen-line bg-white/[0.62] px-3 py-2 text-sm text-lumen-soft shadow-sm transition hover:border-lumen-accent/[0.40] hover:bg-white hover:text-lumen-text dark:bg-white/[0.06] dark:shadow-none dark:hover:bg-lumen-accent/[0.10]"
                                    preserveScroll
                                    preserveState
                                >
                                    {trend.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                <div>
                    <p className="mb-2 text-xs font-semibold text-lumen-muted uppercase">
                        Instant preview
                    </p>
                    {previewPrompts.length > 0 ? (
                        <div className="grid gap-2">
                            {previewPrompts.slice(0, 5).map((prompt) => (
                                <Link
                                    key={prompt.id}
                                    href={PromptController.show(prompt.id)}
                                    className="grid min-w-0 grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-lumen-line bg-white/[0.62] p-2 shadow-sm transition hover:border-lumen-line-strong hover:bg-white dark:bg-white/[0.04] dark:shadow-none dark:hover:bg-white/[0.08]"
                                    prefetch
                                >
                                    {prompt.thumbnail_url ? (
                                        <img
                                            src={prompt.thumbnail_url}
                                            alt={prompt.image_alt}
                                            width={144}
                                            height={144}
                                            className="aspect-square rounded-xl object-cover"
                                            loading="lazy"
                                            decoding="async"
                                        />
                                    ) : (
                                        <PromptImagePlaceholder
                                            compact
                                            className="aspect-square rounded-xl"
                                        />
                                    )}
                                    <span className="min-w-0">
                                        <span className="line-clamp-1 text-sm font-semibold text-lumen-text">
                                            {prompt.title}
                                        </span>
                                        <span className="line-clamp-1 text-xs text-lumen-muted">
                                            {prompt.prompt_preview}
                                        </span>
                                    </span>
                                    <ArrowRight className="size-4 text-lumen-muted" />
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-lumen-line bg-white/[0.52] p-6 text-center text-sm text-lumen-muted dark:bg-white/[0.035]">
                            No prompt preview matches this search yet.
                        </div>
                    )}
                </div>
            </div>
        </DialogContent>
    );
}

function MobileNavigation({
    activeCategory,
    activeSearch,
    activeSort,
    authUser,
    categories,
    categoryCounts,
    totalCompleted,
}: {
    activeCategory: CategoryFilter;
    activeSearch: string;
    activeSort: PromptSort;
    authUser: User | null;
    categories: PromptCategory[];
    categoryCounts: Record<PromptCategory, number>;
    totalCompleted: number;
}) {
    return (
        <SheetContent className="w-[min(92vw,24rem)] border-lumen-line bg-white/[0.92] p-0 text-lumen-text backdrop-blur-2xl dark:bg-lumen-panel">
            <SheetHeader className="border-b border-lumen-line p-5">
                <SheetTitle className="text-lumen-text">
                    Browse prompts
                </SheetTitle>
            </SheetHeader>

            <div className="grid gap-6 overflow-y-auto p-5">
                <div className="grid gap-2">
                    <p className="text-xs font-semibold text-lumen-muted uppercase">
                        Appearance
                    </p>
                    <ThemeToggle mobile />
                </div>

                <div className="grid gap-2">
                    <p className="text-xs font-semibold text-lumen-muted uppercase">
                        Navigation
                    </p>
                    {navigationItems.map((item) =>
                        typeof item.href === 'string' ? (
                            <a
                                key={item.label}
                                href={item.href}
                                className="rounded-2xl border border-lumen-line bg-white/[0.58] px-4 py-3 text-sm font-semibold text-lumen-soft shadow-sm transition hover:bg-white hover:text-lumen-text dark:bg-white/[0.04] dark:shadow-none dark:hover:bg-white/[0.08] dark:hover:text-white"
                            >
                                {item.label}
                            </a>
                        ) : (
                            <Link
                                key={item.label}
                                href={item.href}
                                className="rounded-2xl border border-lumen-line bg-white/[0.58] px-4 py-3 text-sm font-semibold text-lumen-soft shadow-sm transition hover:bg-white hover:text-lumen-text dark:bg-white/[0.04] dark:shadow-none dark:hover:bg-white/[0.08] dark:hover:text-white"
                                preserveScroll
                            >
                                {item.label}
                            </Link>
                        ),
                    )}
                </div>

                <div className="grid gap-2">
                    <p className="text-xs font-semibold text-lumen-muted uppercase">
                        Categories
                    </p>
                    <CategoryRow
                        active={activeCategory === 'all'}
                        count={totalCompleted}
                        href={promptLibraryHref(
                            activeSearch,
                            'all',
                            activeSort,
                        )}
                        label="All prompts"
                    />
                    {categories.map((category) => (
                        <CategoryRow
                            key={category}
                            active={activeCategory === category}
                            count={categoryCounts[category] ?? 0}
                            href={promptLibraryHref(
                                activeSearch,
                                category,
                                activeSort,
                            )}
                            label={categoryLabels[category]}
                        />
                    ))}
                </div>

                <div className="grid gap-2">
                    <Button
                        asChild
                        variant="outline"
                        className="h-11 rounded-full border-lumen-line bg-white/[0.66] text-lumen-text shadow-sm hover:bg-white hover:text-lumen-text dark:bg-white/[0.06] dark:shadow-none dark:hover:bg-white/[0.12] dark:hover:text-white"
                    >
                        <Link href={PromptController.index()}>
                            <Grid2X2 />
                            Prompt Library
                        </Link>
                    </Button>
                    <Button
                        asChild
                        className="h-11 rounded-full bg-gradient-to-r from-lumen-primary to-lumen-accent text-white shadow-[0_12px_32px_rgb(124_58_237_/_0.20)] hover:brightness-105"
                    >
                        <Link href={authUser ? dashboard() : login()}>
                            {authUser ? (
                                <>
                                    <UserCircle />
                                    Dashboard
                                </>
                            ) : (
                                <>
                                    <LogIn />
                                    Login
                                </>
                            )}
                        </Link>
                    </Button>
                </div>
            </div>
        </SheetContent>
    );
}

function CategoryPill({
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
                    ? 'inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-lumen-primary/[0.45] bg-gradient-to-r from-lumen-primary to-lumen-accent px-3.5 text-sm font-semibold text-white shadow-[0_10px_28px_rgb(124_58_237_/_0.20)]'
                    : 'inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-lumen-line bg-white/[0.62] px-3.5 text-sm font-semibold text-lumen-soft shadow-sm transition hover:border-lumen-line-strong hover:bg-white hover:text-lumen-text dark:bg-white/[0.05] dark:shadow-none dark:hover:bg-white/[0.08] dark:hover:text-white'
            }
            preserveScroll
            preserveState
        >
            {label}
            <span className="rounded-full bg-black/[0.05] px-1.5 py-0.5 text-[11px] text-lumen-muted dark:bg-white/10">
                {count}
            </span>
        </Link>
    );
}

function CategoryRow({
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
                    ? 'flex items-center justify-between gap-3 rounded-2xl border border-lumen-primary/[0.45] bg-gradient-to-r from-lumen-primary to-lumen-accent px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_28px_rgb(124_58_237_/_0.20)]'
                    : 'flex items-center justify-between gap-3 rounded-2xl border border-lumen-line bg-white/[0.58] px-4 py-3 text-sm font-semibold text-lumen-soft shadow-sm transition hover:bg-white hover:text-lumen-text dark:bg-white/[0.04] dark:shadow-none dark:hover:bg-white/[0.08] dark:hover:text-white'
            }
            preserveScroll
            preserveState
        >
            <span>{label}</span>
            <span className="rounded-full bg-black/[0.05] px-2 py-0.5 text-[11px] text-lumen-muted dark:bg-white/10">
                {count}
            </span>
        </Link>
    );
}
