import { Form, Head, Link, router, usePoll } from '@inertiajs/react';
import {
    AlertCircle,
    Check,
    CheckCircle2,
    Clock3,
    Copy,
    Images,
    LoaderCircle,
    RefreshCw,
    Search,
    Trash2,
    UploadCloud,
    X,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import AdminPromptController from '@/actions/App/Http/Controllers/AdminPromptController';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useClipboard } from '@/hooks/use-clipboard';
import type {
    AdminPromptItem,
    Paginated,
    PromptAiConfiguration,
    PromptStatus,
    PromptStatusSummary,
} from '@/types';

type Props = {
    prompts: Paginated<AdminPromptItem>;
    statuses: PromptStatus[];
    filters: {
        search: string;
        status: PromptStatus | null;
    };
    summary: PromptStatusSummary;
    aiConfiguration: PromptAiConfiguration;
    requiresPolling: boolean;
};

const statusLabels: Record<PromptStatus, string> = {
    pending: 'Pending',
    processing: 'Processing',
    completed: 'Completed',
    failed: 'Failed',
};

export default function AdminPrompts({
    prompts,
    statuses,
    filters,
    summary,
    aiConfiguration,
    requiresPolling,
}: Props) {
    const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState<PromptStatus | 'all'>(
        filters.status ?? 'all',
    );

    usePoll(
        5000,
        { only: ['prompts', 'requiresPolling'] },
        { autoStart: requiresPolling },
    );

    const applyFilters = (
        nextSearch = search,
        nextStatus: PromptStatus | 'all' = status,
    ) => {
        const query: Record<string, string> = {};

        if (nextSearch.trim() !== '') {
            query.search = nextSearch.trim();
        }

        if (nextStatus !== 'all') {
            query.status = nextStatus;
        }

        router.get(AdminPromptController.index.url(), query, {
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
        setStatus('all');
        applyFilters('', 'all');
    };

    const summaryItems = [
        {
            label: 'Total',
            value: summary.total,
            icon: Images,
        },
        {
            label: 'Pending',
            value: summary.pending,
            icon: Clock3,
        },
        {
            label: 'Processing',
            value: summary.processing,
            icon: LoaderCircle,
        },
        {
            label: 'Completed',
            value: summary.completed,
            icon: CheckCircle2,
        },
        {
            label: 'Failed',
            value: summary.failed,
            icon: AlertCircle,
        },
    ];

    return (
        <>
            <Head title="Prompt Admin Dashboard" />

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto p-4">
                <div className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-semibold tracking-normal">
                            Prompt Admin Dashboard
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {prompts.total} prompt job
                            {prompts.total === 1 ? '' : 's'}
                        </p>
                    </div>

                    <form
                        onSubmit={submit}
                        className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto"
                    >
                        <div className="relative min-w-0 sm:w-72">
                            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                className="pl-9"
                                placeholder="Search jobs"
                            />
                        </div>

                        <Select
                            value={status}
                            onValueChange={(value) => {
                                const nextStatus = value as
                                    | PromptStatus
                                    | 'all';

                                setStatus(nextStatus);
                                applyFilters(search, nextStatus);
                            }}
                        >
                            <SelectTrigger className="w-full sm:w-40">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                {statuses.map((option) => (
                                    <SelectItem key={option} value={option}>
                                        {statusLabels[option]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div className="flex gap-2">
                            <Button type="submit" size="icon" title="Search">
                                <Search />
                                <span className="sr-only">Search</span>
                            </Button>

                            {(filters.search || filters.status) && (
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

                {!aiConfiguration.is_configured && (
                    <Alert className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200">
                        <AlertCircle />
                        <AlertTitle>AI provider not configured</AlertTitle>
                        <AlertDescription>
                            <span>
                                {aiConfiguration.message ??
                                    'Prompt generation cannot run until credentials are configured.'}
                            </span>
                        </AlertDescription>
                    </Alert>
                )}

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    {summaryItems.map((item) => {
                        const Icon = item.icon;

                        return (
                            <Card key={item.label} className="gap-3 py-4">
                                <CardHeader className="flex-row items-center justify-between px-4">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">
                                        {item.label}
                                    </CardTitle>
                                    <Icon className="size-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent className="px-4">
                                    <div className="text-2xl font-semibold">
                                        {item.value}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Reference uploads</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Form
                            {...AdminPromptController.store.form()}
                            resetOnSuccess
                            onSuccess={() => setSelectedFiles([])}
                            className="grid gap-4"
                        >
                            {({ errors, processing, progress }) => {
                                const imageErrors = Object.entries(errors)
                                    .filter(([key]) =>
                                        key.startsWith('images.'),
                                    )
                                    .map(([, value]) => value);

                                return (
                                    <>
                                        <div className="grid gap-2">
                                            <Label htmlFor="images">
                                                Reference images
                                            </Label>
                                            <Input
                                                id="images"
                                                name="images[]"
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp"
                                                multiple
                                                onChange={(event) =>
                                                    setSelectedFiles(
                                                        Array.from(
                                                            event.target.files ??
                                                                [],
                                                        ).map(
                                                            (file) =>
                                                                file.name,
                                                        ),
                                                    )
                                                }
                                            />
                                            {selectedFiles.length > 0 && (
                                                <div className="flex flex-wrap gap-2">
                                                    {selectedFiles.map(
                                                        (file) => (
                                                            <Badge
                                                                key={file}
                                                                variant="outline"
                                                            >
                                                                {file}
                                                            </Badge>
                                                        ),
                                                    )}
                                                </div>
                                            )}
                                            {errors.images && (
                                                <p className="text-sm text-destructive">
                                                    {errors.images}
                                                </p>
                                            )}
                                            {imageErrors.map((error) => (
                                                <p
                                                    key={error}
                                                    className="text-sm text-destructive"
                                                >
                                                    {error}
                                                </p>
                                            ))}
                                        </div>

                                        {progress && (
                                            <div className="h-2 overflow-hidden rounded-full bg-muted">
                                                <div
                                                    className="h-full bg-primary transition-all"
                                                    style={{
                                                        width: `${progress.percentage}%`,
                                                    }}
                                                />
                                            </div>
                                        )}

                                        <Button
                                            type="submit"
                                            className="w-fit"
                                            disabled={processing}
                                        >
                                            {processing ? (
                                                <LoaderCircle className="animate-spin" />
                                            ) : (
                                                <UploadCloud />
                                            )}
                                            Upload
                                        </Button>
                                    </>
                                );
                            }}
                        </Form>
                    </CardContent>
                </Card>

                {prompts.data.length > 0 ? (
                    <div className="grid gap-4 lg:grid-cols-2">
                        {prompts.data.map((prompt) => (
                            <AdminPromptCard key={prompt.id} prompt={prompt} />
                        ))}
                    </div>
                ) : (
                    <div className="flex min-h-56 items-center justify-center rounded-lg border border-dashed">
                        <div className="text-center">
                            <h2 className="text-base font-medium">
                                No prompt jobs found
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Upload reference images to create the library.
                            </p>
                        </div>
                    </div>
                )}

                <Pagination prompts={prompts} />
            </div>
        </>
    );
}

function AdminPromptCard({ prompt }: { prompt: AdminPromptItem }) {
    const [copiedText, copy] = useClipboard();
    const promptText = prompt.prompt ?? '';

    return (
        <Card className="overflow-hidden py-0">
            <div className="grid sm:grid-cols-[13rem_1fr]">
                <img
                    src={prompt.thumbnail_url}
                    alt={prompt.title}
                    className="aspect-[4/3] h-full w-full object-cover"
                    loading="lazy"
                />

                <CardContent className="flex min-h-64 flex-col gap-4 p-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <StatusBadge status={prompt.status} />
                                {prompt.category && (
                                    <Badge variant="secondary">
                                        {prompt.category}
                                    </Badge>
                                )}
                            </div>
                            <h2 className="line-clamp-2 text-sm font-semibold">
                                {prompt.title}
                            </h2>
                            {prompt.user && (
                                <p className="text-xs text-muted-foreground">
                                    {prompt.user.name}
                                </p>
                            )}
                        </div>

                        <div className="flex shrink-0 gap-1">
                            {prompt.status === 'failed' && (
                                <Button
                                    asChild
                                    variant="outline"
                                    size="icon"
                                    title="Retry"
                                >
                                    <Link
                                        href={AdminPromptController.regenerate(
                                            prompt.id,
                                        )}
                                        as="button"
                                        preserveScroll
                                    >
                                        <RefreshCw />
                                        <span className="sr-only">Retry</span>
                                    </Link>
                                </Button>
                            )}

                            <Button
                                asChild
                                variant="ghost"
                                size="icon"
                                title="Delete"
                            >
                                <Link
                                    href={AdminPromptController.destroy(
                                        prompt.id,
                                    )}
                                    as="button"
                                    preserveScroll
                                >
                                    <Trash2 />
                                    <span className="sr-only">Delete</span>
                                </Link>
                            </Button>
                        </div>
                    </div>

                    {prompt.status === 'failed' && prompt.error_message ? (
                        <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                            <AlertCircle className="mt-0.5 size-4 shrink-0" />
                            <p className="break-words">
                                {prompt.error_message}
                            </p>
                        </div>
                    ) : (
                        <p className="line-clamp-4 text-sm leading-6 text-muted-foreground">
                            {promptText || 'Waiting for AI generation.'}
                        </p>
                    )}

                    <div className="mt-auto flex flex-wrap gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => copy(promptText)}
                            disabled={promptText === ''}
                        >
                            {copiedText === promptText ? <Check /> : <Copy />}
                            Copy
                        </Button>
                        {prompt.ai_provider && (
                            <Badge variant="outline">
                                {prompt.ai_model
                                    ? `${prompt.ai_provider} / ${prompt.ai_model}`
                                    : prompt.ai_provider}
                            </Badge>
                        )}
                    </div>
                </CardContent>
            </div>
        </Card>
    );
}

function StatusBadge({ status }: { status: PromptStatus }) {
    const className =
        status === 'completed'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300'
            : status === 'failed'
              ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-300'
              : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300';

    return (
        <Badge variant="outline" className={className}>
            {status === 'processing' && (
                <LoaderCircle className="size-3 animate-spin" />
            )}
            {statusLabels[status]}
        </Badge>
    );
}

function Pagination({ prompts }: { prompts: Paginated<AdminPromptItem> }) {
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

AdminPrompts.layout = {
    breadcrumbs: [
        {
            title: 'Prompt Admin Dashboard',
            href: AdminPromptController.index(),
        },
    ],
};
