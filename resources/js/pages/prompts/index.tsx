import { Head, Link, router } from '@inertiajs/react';
import { Check, Copy, ExternalLink, Search, X } from 'lucide-react';
import type { FormEvent} from 'react';
import { useState } from 'react';
import PromptController from '@/actions/App/Http/Controllers/PromptController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useClipboard } from '@/hooks/use-clipboard';
import type {
    Paginated,
    PromptCategory,
    PromptLibraryItem,
    PromptStyleNotes,
} from '@/types';

const categoryLabels: Record<PromptCategory, string> = {
    portrait: 'Portrait',
    product: 'Product',
    fashion: 'Fashion',
    lifestyle: 'Lifestyle',
    art: 'Art',
    other: 'Other',
};

type Props = {
    prompts: Paginated<PromptLibraryItem>;
    categories: PromptCategory[];
    filters: {
        search: string;
        category: PromptCategory | null;
    };
};

export default function PromptLibrary({ prompts, categories, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [category, setCategory] = useState<PromptCategory | 'all'>(
        filters.category ?? 'all',
    );

    const applyFilters = (
        nextSearch = search,
        nextCategory: PromptCategory | 'all' = category,
    ) => {
        const query: Record<string, string> = {};

        if (nextSearch.trim() !== '') {
            query.search = nextSearch.trim();
        }

        if (nextCategory !== 'all') {
            query.category = nextCategory;
        }

        router.get(PromptController.index.url(), query, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        applyFilters();
    };

    const clearFilters = () => {
        setSearch('');
        setCategory('all');
        applyFilters('', 'all');
    };

    return (
        <>
            <Head title="Prompt Library" />

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto p-4">
                <div className="flex flex-col gap-4 border-b pb-5 md:flex-row md:items-end md:justify-between">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-semibold tracking-normal">
                            Prompt Library
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {prompts.total} saved prompt
                            {prompts.total === 1 ? '' : 's'}
                        </p>
                    </div>

                    <form
                        onSubmit={submit}
                        className="flex w-full flex-col gap-2 sm:flex-row md:w-auto"
                    >
                        <div className="relative min-w-0 sm:w-72">
                            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                className="pl-9"
                                placeholder="Search prompts"
                            />
                        </div>

                        <Select
                            value={category}
                            onValueChange={(value) => {
                                const nextCategory =
                                    value as PromptCategory | 'all';

                                setCategory(nextCategory);
                                applyFilters(search, nextCategory);
                            }}
                        >
                            <SelectTrigger className="w-full sm:w-40">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                {categories.map((option) => (
                                    <SelectItem key={option} value={option}>
                                        {categoryLabels[option]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div className="flex gap-2">
                            <Button type="submit" size="icon" title="Search">
                                <Search />
                                <span className="sr-only">Search</span>
                            </Button>

                            {(filters.search || filters.category) && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    title="Clear"
                                    onClick={clearFilters}
                                >
                                    <X />
                                    <span className="sr-only">Clear</span>
                                </Button>
                            )}
                        </div>
                    </form>
                </div>

                {prompts.data.length > 0 ? (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                        {prompts.data.map((prompt) => (
                            <PromptCard key={prompt.id} prompt={prompt} />
                        ))}
                    </div>
                ) : (
                    <div className="flex min-h-72 items-center justify-center rounded-lg border border-dashed">
                        <div className="text-center">
                            <h2 className="text-base font-medium">
                                No prompts found
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Try a different search or category.
                            </p>
                        </div>
                    </div>
                )}

                <Pagination prompts={prompts} />
            </div>
        </>
    );
}

function PromptCard({ prompt }: { prompt: PromptLibraryItem }) {
    const [copiedText, copy] = useClipboard();
    const promptText = prompt.prompt ?? '';

    return (
        <Card className="gap-0 overflow-hidden py-0">
            <Link
                href={PromptController.show(prompt.id)}
                className="block bg-muted"
                prefetch
            >
                <img
                    src={prompt.thumbnail_url}
                    alt={prompt.title}
                    className="aspect-[4/3] w-full object-cover"
                    loading="lazy"
                />
            </Link>

            <CardContent className="flex min-h-64 flex-col gap-4 p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-2">
                        <Link
                            href={PromptController.show(prompt.id)}
                            className="line-clamp-2 text-sm font-semibold hover:underline"
                            prefetch
                        >
                            {prompt.title}
                        </Link>
                        {prompt.category && (
                            <Badge variant="secondary">
                                {categoryLabels[prompt.category]}
                            </Badge>
                        )}
                    </div>

                    <Button asChild size="icon" variant="ghost" title="Open">
                        <Link href={PromptController.show(prompt.id)} prefetch>
                            <ExternalLink />
                            <span className="sr-only">Open</span>
                        </Link>
                    </Button>
                </div>

                <p className="line-clamp-4 text-sm leading-6 text-muted-foreground">
                    {promptText}
                </p>

                {prompt.style_notes && (
                    <StyleNoteList notes={prompt.style_notes} />
                )}

                <div className="mt-auto flex gap-2">
                    <Button
                        type="button"
                        className="flex-1"
                        onClick={() => copy(promptText)}
                        disabled={promptText === ''}
                    >
                        {copiedText === promptText ? <Check /> : <Copy />}
                        Copy prompt
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

function StyleNoteList({ notes }: { notes: PromptStyleNotes }) {
    return (
        <dl className="grid gap-2 text-xs">
            {(['lighting', 'composition', 'mood'] as const).map((key) => (
                <div key={key} className="grid grid-cols-[7rem_1fr] gap-2">
                    <dt className="font-medium capitalize text-foreground">
                        {key.replace('_', ' ')}
                    </dt>
                    <dd className="line-clamp-1 text-muted-foreground">
                        {notes[key]}
                    </dd>
                </div>
            ))}
        </dl>
    );
}

function Pagination({ prompts }: { prompts: Paginated<PromptLibraryItem> }) {
    if (prompts.last_page <= 1) {
        return null;
    }

    return (
        <div className="flex items-center justify-between border-t pt-4 text-sm">
            <span className="text-muted-foreground">
                Showing {prompts.from ?? 0}-{prompts.to ?? 0} of{' '}
                {prompts.total}
            </span>
            <div className="flex gap-2">
                <Button
                    asChild
                    variant="outline"
                    size="sm"
                    disabled={!prompts.prev_page_url}
                >
                    {prompts.prev_page_url ? (
                        <Link href={prompts.prev_page_url}>Previous</Link>
                    ) : (
                        <span>Previous</span>
                    )}
                </Button>
                <Button
                    asChild
                    variant="outline"
                    size="sm"
                    disabled={!prompts.next_page_url}
                >
                    {prompts.next_page_url ? (
                        <Link href={prompts.next_page_url}>Next</Link>
                    ) : (
                        <span>Next</span>
                    )}
                </Button>
            </div>
        </div>
    );
}

PromptLibrary.layout = {
    breadcrumbs: [
        {
            title: 'Prompt Library',
            href: PromptController.index(),
        },
    ],
};
