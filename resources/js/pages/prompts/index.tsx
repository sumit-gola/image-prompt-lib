import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowUpDown,
    Check,
    Copy,
    Grid2X2,
    ImageIcon,
    LayoutDashboard,
    LogIn,
    Menu,
    Search,
    Share2,
    Sparkles,
    X,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import PromptController from '@/actions/App/Http/Controllers/PromptController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { usePromptActions } from '@/hooks/use-prompt-actions';
import { dashboard, home, login } from '@/routes';
import type {
    Paginated,
    PromptCategory,
    PromptLibraryItem,
    PromptSort,
    User,
} from '@/types';

const categoryLabels: Record<PromptCategory, string> = {
    portrait: 'Portrait',
    product: 'Product',
    fashion: 'Fashion',
    lifestyle: 'Lifestyle',
    art: 'Art',
    other: 'Other',
};

const categoryThemes: Record<PromptCategory, string> = {
    portrait:
        'border-[#ef7c55]/35 bg-[#ef7c55]/12 text-[#8f321a] dark:text-[#ffb69e]',
    product:
        'border-[#009e91]/35 bg-[#009e91]/12 text-[#045f58] dark:text-[#7ee5da]',
    fashion:
        'border-[#7057ff]/35 bg-[#7057ff]/12 text-[#4630a7] dark:text-[#c0b6ff]',
    lifestyle:
        'border-[#c99a18]/40 bg-[#c99a18]/14 text-[#755608] dark:text-[#f4d16b]',
    art: 'border-[#2d6cdf]/35 bg-[#2d6cdf]/12 text-[#1f4b92] dark:text-[#9bc4ff]',
    other: 'border-neutral-300 bg-neutral-100 text-neutral-700 dark:border-white/15 dark:bg-white/10 dark:text-neutral-200',
};

const sortLabels: Record<PromptSort, string> = {
    newest: 'Newest',
    most_copied: 'Most copied',
    oldest: 'Oldest',
    category: 'Category',
};

type CategoryFilter = PromptCategory | 'all';

type Props = {
    prompts: Paginated<PromptLibraryItem>;
    categories: PromptCategory[];
    categoryCounts: Record<PromptCategory, number>;
    sorts: PromptSort[];
    suggestedPrompts: PromptLibraryItem[];
    totalCompleted: number;
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
    totalCompleted,
    filters,
}: Props) {
    const { auth } = usePage<{ auth: { user: User | null } }>().props;
    const [search, setSearch] = useState(filters.search ?? '');
    const [category, setCategory] = useState<CategoryFilter>(
        filters.category ?? 'all',
    );
    const [sort, setSort] = useState<PromptSort>(filters.sort ?? 'newest');
    const hasFilters = Boolean(filters.search || filters.category);

    const applyFilters = (
        nextSearch = search,
        nextCategory: CategoryFilter = category,
        nextSort: PromptSort = sort,
    ) => {
        router.get(
            home.url({
                query: buildQuery(nextSearch, nextCategory, nextSort),
            }),
            {},
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            },
        );
    };

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        applyFilters();
    };

    const clearFilters = () => {
        setSearch('');
        setCategory('all');
        setSort('newest');
        applyFilters('', 'all', 'newest');
    };

    const filteredLabel = filters.category
        ? categoryLabels[filters.category]
        : 'All categories';

    return (
        <>
            <Head title="Prompt Library" />

            <div className="min-h-screen overflow-x-hidden bg-[#eef1ed] text-[#11120f] dark:bg-[#070807] dark:text-white">
                <header className="sticky top-0 z-40 border-b border-black/10 bg-[#11120f] text-white shadow-[0_14px_40px_rgba(17,18,15,0.22)]">
                    <div className="mx-auto max-w-[1580px] px-4 py-3 sm:px-6 lg:px-8">
                        <div className="grid min-w-0 gap-3 lg:grid-cols-[auto_minmax(24rem,1fr)_auto] lg:items-center">
                            <Link
                                href={home()}
                                className="flex min-w-0 items-center gap-3"
                            >
                                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#f3efe5] text-[#11120f] shadow-[inset_0_-2px_0_rgba(0,0,0,0.18)]">
                                    <Sparkles className="size-5" />
                                </span>
                                <span className="min-w-0">
                                    <span className="block truncate text-lg font-semibold leading-5">
                                        Prompt Library
                                    </span>
                                    <span className="block truncate text-[11px] font-semibold uppercase text-white/48">
                                        Image prompt archive
                                    </span>
                                </span>
                            </Link>

                            <form
                                onSubmit={submit}
                                className="hidden min-w-0 grid-cols-[minmax(0,1fr)_10.75rem_2.75rem] gap-2 md:grid"
                            >
                                <div className="relative min-w-0">
                                    <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-neutral-500" />
                                    <Input
                                        value={search}
                                        onChange={(event) =>
                                            setSearch(event.target.value)
                                        }
                                        className="h-11 rounded-lg border-white/10 bg-white text-[#11120f] pl-10 shadow-none placeholder:text-neutral-500 focus-visible:ring-[#00a99a]/45"
                                        placeholder="Search prompts, styles, categories"
                                    />
                                </div>

                                <SortSelect
                                    sort={sort}
                                    sorts={sorts}
                                    onChange={(nextSort) => {
                                        setSort(nextSort);
                                        applyFilters(
                                            search,
                                            category,
                                            nextSort,
                                        );
                                    }}
                                    dark
                                />

                                <Button
                                    type="submit"
                                    size="icon"
                                    title="Search"
                                    className="h-11 w-11 shrink-0 rounded-lg bg-[#f3efe5] text-[#11120f] hover:bg-white"
                                >
                                    <Search />
                                    <span className="sr-only">Search</span>
                                </Button>
                            </form>

                            <div className="flex min-w-0 items-center justify-end gap-2">
                                <Button
                                    asChild
                                    variant="outline"
                                    size="sm"
                                    className="hidden h-11 rounded-lg border-white/12 bg-white/7 text-white hover:bg-white hover:text-[#11120f] xl:inline-flex"
                                >
                                    <Link href={PromptController.index()}>
                                        Prompt Library
                                    </Link>
                                </Button>
                                <Button
                                    asChild
                                    size="sm"
                                    className="hidden h-11 rounded-lg bg-white text-[#11120f] hover:bg-[#f3efe5] xl:inline-flex"
                                >
                                    <Link
                                        href={auth.user ? dashboard() : login()}
                                    >
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
                                            className="h-11 w-11 shrink-0 rounded-lg border-white/12 bg-white/7 text-white hover:bg-white hover:text-[#11120f] xl:hidden"
                                            title="Open menu"
                                        >
                                            <Menu />
                                            <span className="sr-only">
                                                Open menu
                                            </span>
                                        </Button>
                                    </SheetTrigger>
                                    <SheetContent className="w-[22rem] p-0">
                                        <SheetHeader className="border-b">
                                            <SheetTitle>
                                                Browse prompts
                                            </SheetTitle>
                                        </SheetHeader>
                                        <div className="grid gap-6 p-4">
                                            <div className="grid gap-2">
                                                <p className="text-xs font-semibold uppercase text-neutral-500">
                                                    Categories
                                                </p>
                                                <div className="grid gap-1">
                                                    <MobileCategoryLink
                                                        active={
                                                            category === 'all'
                                                        }
                                                        label="All prompts"
                                                        count={totalCompleted}
                                                        href={home({
                                                            query: buildQuery(
                                                                search,
                                                                'all',
                                                                sort,
                                                            ),
                                                        })}
                                                    />
                                                    {categories.map(
                                                        (option) => (
                                                            <MobileCategoryLink
                                                                key={option}
                                                                active={
                                                                    category ===
                                                                    option
                                                                }
                                                                label={
                                                                    categoryLabels[
                                                                        option
                                                                    ]
                                                                }
                                                                count={
                                                                    categoryCounts[
                                                                        option
                                                                    ] ?? 0
                                                                }
                                                                href={home({
                                                                    query: buildQuery(
                                                                        search,
                                                                        option,
                                                                        sort,
                                                                    ),
                                                                })}
                                                            />
                                                        ),
                                                    )}
                                                </div>
                                            </div>

                                            <div className="grid gap-2">
                                                <Button
                                                    asChild
                                                    variant="outline"
                                                >
                                                    <Link
                                                        href={PromptController.index()}
                                                    >
                                                        Prompt Library
                                                    </Link>
                                                </Button>
                                                <Button asChild>
                                                    <Link
                                                        href={
                                                            auth.user
                                                                ? dashboard()
                                                                : login()
                                                        }
                                                    >
                                                        {auth.user
                                                            ? 'Dashboard'
                                                            : 'Login'}
                                                    </Link>
                                                </Button>
                                            </div>
                                        </div>
                                    </SheetContent>
                                </Sheet>
                            </div>
                        </div>

                        <div className="mt-3 hidden min-w-0 lg:block">
                            <div className="flex min-w-0 gap-1 overflow-x-auto rounded-lg border border-white/10 bg-white/6 p-1">
                                <CategoryLink
                                    active={category === 'all'}
                                    label="All"
                                    count={totalCompleted}
                                    href={home({
                                        query: buildQuery(search, 'all', sort),
                                    })}
                                />
                                {categories.map((option) => (
                                    <CategoryLink
                                        key={option}
                                        active={category === option}
                                        label={categoryLabels[option]}
                                        count={categoryCounts[option] ?? 0}
                                        href={home({
                                            query: buildQuery(
                                                search,
                                                option,
                                                sort,
                                            ),
                                        })}
                                    />
                                ))}
                            </div>
                        </div>

                        <form
                            onSubmit={submit}
                            className="mt-3 grid gap-2 md:hidden"
                        >
                            <div className="relative">
                                <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-neutral-500" />
                                <Input
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    className="h-11 rounded-lg bg-white pl-10 text-[#11120f] shadow-none"
                                    placeholder="Search prompts"
                                />
                            </div>
                            <div className="grid grid-cols-[1fr_auto] gap-2">
                                <SortSelect
                                    sort={sort}
                                    sorts={sorts}
                                    onChange={(nextSort) => {
                                        setSort(nextSort);
                                        applyFilters(
                                            search,
                                            category,
                                            nextSort,
                                        );
                                    }}
                                />
                                <Button
                                    type="submit"
                                    size="icon"
                                    title="Search"
                                    className="h-11 w-11 rounded-lg bg-[#f3efe5] text-[#11120f] hover:bg-white"
                                >
                                    <Search />
                                    <span className="sr-only">Search</span>
                                </Button>
                            </div>
                        </form>
                    </div>
                </header>

                <main className="mx-auto max-w-[1580px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                    <div className="mb-6 border-b border-[#d2d8d2] pb-5 dark:border-white/10">
                        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                            <div className="min-w-0">
                                <div className="mb-3 flex flex-wrap items-center gap-2">
                                    <Badge className="border-transparent bg-[#11120f] text-white dark:bg-white dark:text-[#11120f]">
                                        <Grid2X2 />
                                        Browse board
                                    </Badge>
                                    <span className="text-xs font-semibold uppercase text-[#72756d] dark:text-white/46">
                                        AI image prompts ready to copy
                                    </span>
                                </div>
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-4">
                                    <h1 className="text-4xl font-semibold leading-none tracking-normal sm:text-5xl">
                                        Prompt Library
                                    </h1>
                                    <p className="max-w-xl pb-1 text-sm leading-6 text-[#666a61] dark:text-white/56">
                                        {prompts.total} match
                                        {prompts.total === 1 ? '' : 'es'} in{' '}
                                        {filteredLabel.toLowerCase()}.{' '}
                                        {totalCompleted} total prompt
                                        {totalCompleted === 1 ? '' : 's'} in the
                                        library.
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                                {filters.category && (
                                    <Badge
                                        variant="outline"
                                        className={
                                            categoryThemes[filters.category]
                                        }
                                    >
                                        {categoryLabels[filters.category]}
                                    </Badge>
                                )}
                                {filters.search && (
                                    <Badge
                                        variant="outline"
                                        className="max-w-full border-[#ef7c55]/35 bg-[#ef7c55]/12 text-[#9a3b20] dark:text-[#ffb69e]"
                                    >
                                        <span className="truncate">
                                            {filters.search}
                                        </span>
                                    </Badge>
                                )}
                                <Badge variant="outline">
                                    {sortLabels[filters.sort]}
                                </Badge>
                                {hasFilters && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={clearFilters}
                                        className="rounded-lg"
                                    >
                                        <X />
                                        Clear
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    {prompts.data.length > 0 ? (
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                            {prompts.data.map((prompt) => (
                                <PromptCard key={prompt.id} prompt={prompt} />
                            ))}
                        </div>
                    ) : (
                        <EmptyState
                            category={filters.category}
                            hasFilters={hasFilters}
                            onClear={clearFilters}
                            suggestedPrompts={suggestedPrompts}
                            totalCompleted={totalCompleted}
                        />
                    )}

                    <Pagination prompts={prompts} />
                </main>
            </div>
        </>
    );
}

function PromptCard({ prompt }: { prompt: PromptLibraryItem }) {
    const {
        copiedValue,
        copyCount,
        copyPrompt,
        sharePrompt,
        shareStatus,
    } = usePromptActions(prompt);
    const promptText = prompt.prompt ?? '';
    const isCopied = copiedValue === promptText;
    const shareTitle =
        shareStatus === 'link-copied'
            ? 'Link copied'
            : shareStatus === 'shared'
              ? 'Shared'
              : 'Share prompt';

    return (
        <article className="group relative isolate overflow-hidden rounded-lg border border-[#cdd4cd] bg-[#fbfbf6] shadow-[0_1px_0_rgba(17,18,15,0.06),0_16px_34px_rgba(17,18,15,0.08)] transition duration-200 hover:-translate-y-1 hover:border-[#aeb8ad] hover:shadow-[0_24px_56px_rgba(17,18,15,0.16)] dark:border-white/10 dark:bg-white/7 dark:shadow-none dark:hover:border-white/24">
            <Link
                href={PromptController.show(prompt.id)}
                className="absolute inset-0 z-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#009e91]"
                aria-label={`Open ${prompt.title}`}
                prefetch
            />

            <div className="relative z-10 pointer-events-none">
                <div className="relative overflow-hidden bg-[#dde3de] dark:bg-white/10">
                    <img
                        src={prompt.thumbnail_url}
                        alt={prompt.title}
                        className="aspect-[4/5] w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                        loading="lazy"
                    />
                    <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
                        {prompt.category && (
                            <Badge
                                variant="outline"
                                className={`bg-white/92 shadow-sm backdrop-blur dark:bg-[#11120f]/90 ${categoryThemes[prompt.category]}`}
                            >
                                {categoryLabels[prompt.category]}
                            </Badge>
                        )}
                        <span className="ml-auto inline-flex h-8 items-center gap-1 rounded-md bg-[#11120f]/90 px-2.5 text-xs font-semibold text-white shadow-sm backdrop-blur">
                            <Copy className="size-3.5" />
                            {formatCount(copyCount)}
                        </span>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 flex translate-y-2 items-end justify-between gap-3 bg-linear-to-t from-black/70 via-black/20 to-transparent p-3 opacity-0 transition duration-200 group-hover:translate-y-0 group-hover:opacity-100">
                        <span className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-[#11120f] shadow-sm">
                            Open prompt
                        </span>
                        <span className="rounded-md bg-[#009e91] px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
                            Copy ready
                        </span>
                    </div>
                </div>

                <div className="grid min-h-[15rem] gap-4 p-4">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase text-[#7b8076] dark:text-white/46">
                            <span>{formatGeneratedDate(prompt.generated_at)}</span>
                            <span className="h-px min-w-8 flex-1 bg-[#d2d8d2] dark:bg-white/10" />
                            <span>Prompt</span>
                        </div>
                        <h2 className="line-clamp-2 text-xl font-semibold leading-6 tracking-normal text-[#11120f] dark:text-white">
                            {prompt.title}
                        </h2>
                        <p className="line-clamp-3 border-l-2 border-[#009e91]/60 pl-3 text-sm leading-6 text-[#62675e] dark:text-white/66">
                            {prompt.prompt_preview || promptText}
                        </p>
                    </div>

                    <div className="pointer-events-auto mt-auto grid grid-cols-[minmax(0,1fr)_2.75rem] gap-2">
                        <Button
                            type="button"
                            className="h-11 rounded-lg bg-[#11120f] text-white hover:bg-[#272923] dark:bg-white dark:text-[#11120f] dark:hover:bg-neutral-200"
                            onClick={() => void copyPrompt()}
                            disabled={promptText === ''}
                        >
                            {isCopied ? <Check /> : <Copy />}
                            {isCopied ? 'Copied' : 'Copy prompt'}
                        </Button>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    title={shareTitle}
                                    className="h-11 w-11 rounded-lg bg-white/80 dark:bg-white/7"
                                    onClick={() => void sharePrompt()}
                                >
                                    {shareStatus === 'link-copied' ? (
                                        <Check />
                                    ) : (
                                        <Share2 />
                                    )}
                                    <span className="sr-only">
                                        {shareTitle}
                                    </span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>{shareTitle}</TooltipContent>
                        </Tooltip>
                    </div>
                </div>
            </div>
        </article>
    );
}

function EmptyState({
    category,
    hasFilters,
    onClear,
    suggestedPrompts,
    totalCompleted,
}: {
    category: PromptCategory | null;
    hasFilters: boolean;
    onClear: () => void;
    suggestedPrompts: PromptLibraryItem[];
    totalCompleted: number;
}) {
    return (
        <section className="overflow-hidden rounded-lg border border-[#151713] bg-[#11120f] text-white shadow-[0_24px_70px_rgba(17,18,15,0.2)]">
            <div className="h-1 w-full bg-[linear-gradient(90deg,#f3efe5_0_28%,#009e91_28%_54%,#ef7c55_54%_78%,#c99a18_78%_100%)]" />
            <div className="grid gap-7 p-5 sm:p-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:p-8">
                <div className="flex min-w-0 flex-col justify-between gap-8">
                    <div className="space-y-4">
                        <span className="flex size-12 items-center justify-center rounded-lg bg-white text-[#11120f] shadow-sm">
                            <ImageIcon className="size-5" />
                        </span>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-semibold tracking-normal">
                                {category
                                    ? `No ${categoryLabels[category].toLowerCase()} prompts yet`
                                    : 'No prompts found'}
                            </h2>
                            <p className="max-w-md text-sm leading-6 text-white/62">
                                This filter has no matches right now. The full
                                library still has {totalCompleted} prompt
                                {totalCompleted === 1 ? '' : 's'} available to
                                browse and copy.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {hasFilters && (
                            <Button
                                type="button"
                                onClick={onClear}
                                className="rounded-lg bg-white text-[#11120f] hover:bg-[#f3efe5]"
                            >
                                <X />
                                Show all prompts
                            </Button>
                        )}
                        <Button
                            asChild
                            variant="outline"
                            className="rounded-lg border-white/16 bg-white/7 text-white hover:bg-white hover:text-[#11120f]"
                        >
                            <Link href={PromptController.index()}>
                                Browse library
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="min-w-0">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase text-white/46">
                            Available now
                        </p>
                        <span className="h-px min-w-10 flex-1 bg-white/12" />
                    </div>

                    {suggestedPrompts.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                            {suggestedPrompts.map((prompt) => (
                                <Link
                                    key={prompt.id}
                                    href={PromptController.show(prompt.id)}
                                    className="group/minicard min-w-0 overflow-hidden rounded-lg border border-white/12 bg-white/7 transition hover:-translate-y-0.5 hover:bg-white/12"
                                    prefetch
                                >
                                    <img
                                        src={prompt.thumbnail_url}
                                        alt={prompt.title}
                                        className="aspect-[4/5] w-full object-cover transition group-hover/minicard:scale-[1.035]"
                                        loading="lazy"
                                    />
                                    <div className="p-3">
                                        <p className="line-clamp-2 text-sm font-semibold leading-5">
                                            {prompt.title}
                                        </p>
                                        <p className="mt-1 text-xs text-white/48">
                                            {prompt.category
                                                ? categoryLabels[
                                                      prompt.category
                                                  ]
                                                : 'Prompt'}
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="grid min-h-44 place-items-center rounded-lg border border-dashed border-white/16 bg-white/5 p-6 text-center text-sm text-white/54">
                            Completed prompts will appear here after the admin
                            generates them.
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

function SortSelect({
    dark = false,
    onChange,
    sort,
    sorts,
}: {
    dark?: boolean;
    onChange: (sort: PromptSort) => void;
    sort: PromptSort;
    sorts: PromptSort[];
}) {
    return (
        <Select
            value={sort}
            onValueChange={(value) => onChange(value as PromptSort)}
        >
            <SelectTrigger
                className={
                    dark
                        ? 'h-11 rounded-lg border-white/10 bg-white text-[#11120f] shadow-none'
                        : 'h-11 rounded-lg bg-white text-[#11120f] shadow-none'
                }
            >
                <ArrowUpDown className="size-4 text-neutral-500" />
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {sorts.map((option) => (
                    <SelectItem key={option} value={option}>
                        {sortLabels[option]}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

function CategoryLink({
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
                    ? 'flex shrink-0 items-center gap-2 rounded-md bg-white px-3.5 py-2 text-sm font-semibold text-[#11120f] shadow-sm'
                    : 'flex shrink-0 items-center gap-2 rounded-md px-3.5 py-2 text-sm font-semibold text-white/68 transition hover:bg-white/10 hover:text-white'
            }
        >
            <span>{label}</span>
            <span
                className={
                    active
                        ? 'rounded bg-[#11120f]/8 px-1.5 py-0.5 text-[11px] text-[#11120f]/66'
                        : 'rounded bg-white/8 px-1.5 py-0.5 text-[11px] text-white/46'
                }
            >
                {count}
            </span>
        </Link>
    );
}

function MobileCategoryLink({
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
                    ? 'flex items-center justify-between rounded-md bg-[#11120f] px-3 py-2 text-sm font-semibold text-white'
                    : 'flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-black/5 dark:text-neutral-300 dark:hover:bg-white/10'
            }
        >
            <span>{label}</span>
            <span
                className={
                    active
                        ? 'rounded bg-white/12 px-1.5 py-0.5 text-[11px] text-white/70'
                        : 'rounded bg-black/6 px-1.5 py-0.5 text-[11px] text-neutral-500 dark:bg-white/10'
                }
            >
                {count}
            </span>
        </Link>
    );
}

function Pagination({ prompts }: { prompts: Paginated<PromptLibraryItem> }) {
    if (prompts.last_page <= 1) {
        return null;
    }

    return (
        <div className="mt-6 flex flex-col gap-3 border-t border-[#d2d8d2] pt-4 text-sm sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
            <span className="text-[#666a61] dark:text-white/56">
                Showing {prompts.from ?? 0}-{prompts.to ?? 0} of{' '}
                {prompts.total}
            </span>
            <div className="grid grid-cols-2 gap-2 sm:flex">
                {prompts.prev_page_url ? (
                    <Button asChild variant="outline" size="sm">
                        <Link href={prompts.prev_page_url}>Previous</Link>
                    </Button>
                ) : (
                    <Button variant="outline" size="sm" disabled>
                        Previous
                    </Button>
                )}
                {prompts.next_page_url ? (
                    <Button asChild variant="outline" size="sm">
                        <Link href={prompts.next_page_url}>Next</Link>
                    </Button>
                ) : (
                    <Button variant="outline" size="sm" disabled>
                        Next
                    </Button>
                )}
            </div>
        </div>
    );
}

function buildQuery(
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

function formatGeneratedDate(value: string | null): string {
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

function formatCount(value: number): string {
    return new Intl.NumberFormat('en-US', {
        notation: value >= 1000 ? 'compact' : 'standard',
    }).format(value);
}
