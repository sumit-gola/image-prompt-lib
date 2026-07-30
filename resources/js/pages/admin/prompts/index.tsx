import { Form, Head, Link, router, usePoll } from '@inertiajs/react';
import {
    AlertCircle,
    Bot,
    CheckCircle2,
    Clock3,
    Copy,
    Edit3,
    Eye,
    Filter,
    ImageIcon,
    Images,
    ListChecks,
    LoaderCircle,
    RefreshCw,
    Search,
    SlidersHorizontal,
    Trash2,
    UploadCloud,
    WandSparkles,
    X,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import AdminPromptController from '@/actions/App/Http/Controllers/AdminPromptController';
import PromptController from '@/actions/App/Http/Controllers/PromptController';
import { PromptImagePlaceholder } from '@/components/prompts/prompt-image-placeholder';
import { categoryLabels } from '@/components/prompts/prompt-library-config';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
    PromptCategory,
    PromptGenerationMode,
    PromptStatus,
    PromptStatusSummary,
} from '@/types';

type AdminSort =
    | 'newest'
    | 'oldest'
    | 'most_copied'
    | 'title'
    | 'status'
    | 'category'
    | 'generation_mode';

type SourceSiteFilter = 'local' | 'promptplum';

type BulkAction = 'status' | 'category' | 'retry' | 'delete';

type Props = {
    prompts: Paginated<AdminPromptItem>;
    statuses: PromptStatus[];
    categories: PromptCategory[];
    generationModes: PromptGenerationMode[];
    sourceSites: SourceSiteFilter[];
    sorts: AdminSort[];
    filters: {
        search: string;
        status: PromptStatus | null;
        category: PromptCategory | null;
        generation_mode: PromptGenerationMode | null;
        source_site: SourceSiteFilter | null;
        created_from: string | null;
        created_to: string | null;
        generated_from: string | null;
        generated_to: string | null;
        sort: AdminSort;
    };
    summary: PromptStatusSummary;
    aiConfiguration: PromptAiConfiguration;
    imageAiConfiguration: PromptAiConfiguration;
    requiresPolling: boolean;
};

const statusLabels: Record<PromptStatus, string> = {
    pending: 'Pending',
    processing: 'Processing',
    completed: 'Completed',
    failed: 'Failed',
};

const generationModeLabels: Record<PromptGenerationMode, string> = {
    reference_image: 'Reference',
    auto: 'Auto generated',
    imported: 'Imported',
};

const sourceSiteLabels: Record<SourceSiteFilter, string> = {
    local: 'Local / AI generated',
    promptplum: 'PromptPlum',
};

const sortLabels: Record<AdminSort, string> = {
    newest: 'Newest',
    oldest: 'Oldest',
    most_copied: 'Most copied',
    title: 'Title A-Z',
    status: 'Status',
    category: 'Category',
    generation_mode: 'Generation mode',
};

export default function AdminPrompts({
    prompts,
    statuses,
    categories,
    generationModes,
    sourceSites,
    sorts,
    filters,
    summary,
    aiConfiguration,
    imageAiConfiguration,
    requiresPolling,
}: Props) {
    const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
    const [autoCategory, setAutoCategory] =
        useState<PromptCategory>('portrait');
    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState<PromptStatus | 'all'>(
        filters.status ?? 'all',
    );
    const [category, setCategory] = useState<PromptCategory | 'all'>(
        filters.category ?? 'all',
    );
    const [generationMode, setGenerationMode] = useState<
        PromptGenerationMode | 'all'
    >(filters.generation_mode ?? 'all');
    const [sourceSite, setSourceSite] = useState<SourceSiteFilter | 'all'>(
        filters.source_site ?? 'all',
    );
    const [createdFrom, setCreatedFrom] = useState(filters.created_from ?? '');
    const [createdTo, setCreatedTo] = useState(filters.created_to ?? '');
    const [generatedFrom, setGeneratedFrom] = useState(
        filters.generated_from ?? '',
    );
    const [generatedTo, setGeneratedTo] = useState(filters.generated_to ?? '');
    const [sort, setSort] = useState<AdminSort>(filters.sort ?? 'newest');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [bulkAction, setBulkAction] = useState<BulkAction>('status');
    const [bulkStatus, setBulkStatus] =
        useState<PromptStatus>('completed');
    const [bulkCategory, setBulkCategory] =
        useState<PromptCategory>('portrait');
    const [deletePrompt, setDeletePrompt] = useState<AdminPromptItem | null>(
        null,
    );
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

    usePoll(
        5000,
        { only: ['prompts', 'requiresPolling', 'summary'] },
        { autoStart: requiresPolling },
    );

    const activeFilters = useMemo(
        () =>
            [
                filters.search && `Search: ${filters.search}`,
                filters.status && `Status: ${statusLabels[filters.status]}`,
                filters.category &&
                    `Category: ${categoryLabels[filters.category]}`,
                filters.generation_mode &&
                    `Mode: ${generationModeLabels[filters.generation_mode]}`,
                filters.source_site &&
                    `Source: ${sourceSiteLabels[filters.source_site]}`,
                filters.created_from && `Created from ${filters.created_from}`,
                filters.created_to && `Created to ${filters.created_to}`,
                filters.generated_from &&
                    `Generated from ${filters.generated_from}`,
                filters.generated_to && `Generated to ${filters.generated_to}`,
                filters.sort !== 'newest' && `Sort: ${sortLabels[filters.sort]}`,
            ].filter(Boolean) as string[],
        [filters],
    );

    const allVisibleSelected =
        prompts.data.length > 0 &&
        prompts.data.every((prompt) => selectedIds.includes(prompt.id));

    const visibleSelectedCount = prompts.data.filter((prompt) =>
        selectedIds.includes(prompt.id),
    ).length;

    const applyFilters = (
        overrides: Partial<{
            search: string;
            status: PromptStatus | 'all';
            category: PromptCategory | 'all';
            generationMode: PromptGenerationMode | 'all';
            sourceSite: SourceSiteFilter | 'all';
            createdFrom: string;
            createdTo: string;
            generatedFrom: string;
            generatedTo: string;
            sort: AdminSort;
        }> = {},
    ) => {
        const next = {
            search,
            status,
            category,
            generationMode,
            sourceSite,
            createdFrom,
            createdTo,
            generatedFrom,
            generatedTo,
            sort,
            ...overrides,
        };
        const query: Record<string, string> = {};

        if (next.search.trim() !== '') {
            query.search = next.search.trim();
        }

        if (next.status !== 'all') {
            query.status = next.status;
        }

        if (next.category !== 'all') {
            query.category = next.category;
        }

        if (next.generationMode !== 'all') {
            query.generation_mode = next.generationMode;
        }

        if (next.sourceSite !== 'all') {
            query.source_site = next.sourceSite;
        }

        if (next.createdFrom !== '') {
            query.created_from = next.createdFrom;
        }

        if (next.createdTo !== '') {
            query.created_to = next.createdTo;
        }

        if (next.generatedFrom !== '') {
            query.generated_from = next.generatedFrom;
        }

        if (next.generatedTo !== '') {
            query.generated_to = next.generatedTo;
        }

        if (next.sort !== 'newest') {
            query.sort = next.sort;
        }

        router.get(AdminPromptController.index.url(), query, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
            onSuccess: () => setSelectedIds([]),
        });
    };

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        applyFilters();
    };

    const clearFilters = () => {
        setSearch('');
        setStatus('all');
        setCategory('all');
        setGenerationMode('all');
        setSourceSite('all');
        setCreatedFrom('');
        setCreatedTo('');
        setGeneratedFrom('');
        setGeneratedTo('');
        setSort('newest');
        applyFilters({
            search: '',
            status: 'all',
            category: 'all',
            generationMode: 'all',
            sourceSite: 'all',
            createdFrom: '',
            createdTo: '',
            generatedFrom: '',
            generatedTo: '',
            sort: 'newest',
        });
    };

    const toggleAllVisible = (checked: boolean | 'indeterminate') => {
        if (checked) {
            setSelectedIds((current) =>
                Array.from(
                    new Set([
                        ...current,
                        ...prompts.data.map((prompt) => prompt.id),
                    ]),
                ),
            );

            return;
        }

        const visibleIds = new Set(prompts.data.map((prompt) => prompt.id));
        setSelectedIds((current) =>
            current.filter((id) => !visibleIds.has(id)),
        );
    };

    const togglePrompt = (
        prompt: AdminPromptItem,
        checked: boolean | 'indeterminate',
    ) => {
        setSelectedIds((current) =>
            checked
                ? Array.from(new Set([...current, prompt.id]))
                : current.filter((id) => id !== prompt.id),
        );
    };

    const runBulkAction = (action = bulkAction) => {
        if (selectedIds.length === 0) {
            return;
        }

        router.patch(
            AdminPromptController.bulk(),
            {
                action,
                prompt_ids: selectedIds,
                status: action === 'status' ? bulkStatus : null,
                category: action === 'category' ? bulkCategory : null,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setSelectedIds([]);
                    setBulkDeleteOpen(false);
                },
            },
        );
    };

    const deleteSelectedPrompt = () => {
        if (!deletePrompt) {
            return;
        }

        router.delete(AdminPromptController.destroy(deletePrompt.id), {
            preserveScroll: true,
            onSuccess: () => {
                setSelectedIds((current) =>
                    current.filter((id) => id !== deletePrompt.id),
                );
                setDeletePrompt(null);
            },
        });
    };

    return (
        <>
            <Head title="Prompt Management" />

            <div className="flex h-full flex-1 flex-col gap-5 overflow-x-hidden p-4 sm:p-5">
                <AdminHeader total={prompts.total} />

                <ConfigurationAlerts
                    aiConfiguration={aiConfiguration}
                    imageAiConfiguration={imageAiConfiguration}
                />

                <SummaryGrid summary={summary} />

                <ManagementToolbar
                    activeFilters={activeFilters}
                    categories={categories}
                    category={category}
                    clearFilters={clearFilters}
                    createdFrom={createdFrom}
                    createdTo={createdTo}
                    generatedFrom={generatedFrom}
                    generatedTo={generatedTo}
                    generationMode={generationMode}
                    generationModes={generationModes}
                    search={search}
                    setCategory={setCategory}
                    setCreatedFrom={setCreatedFrom}
                    setCreatedTo={setCreatedTo}
                    setGeneratedFrom={setGeneratedFrom}
                    setGeneratedTo={setGeneratedTo}
                    setGenerationMode={setGenerationMode}
                    setSearch={setSearch}
                    setSort={setSort}
                    setSourceSite={setSourceSite}
                    setStatus={setStatus}
                    sort={sort}
                    sorts={sorts}
                    sourceSite={sourceSite}
                    sourceSites={sourceSites}
                    status={status}
                    statuses={statuses}
                    submit={submit}
                    applyFilters={applyFilters}
                />

                <BulkActionBar
                    bulkAction={bulkAction}
                    bulkCategory={bulkCategory}
                    bulkStatus={bulkStatus}
                    categories={categories}
                    runBulkAction={runBulkAction}
                    selectedCount={selectedIds.length}
                    setBulkAction={setBulkAction}
                    setBulkCategory={setBulkCategory}
                    setBulkDeleteOpen={setBulkDeleteOpen}
                    setBulkStatus={setBulkStatus}
                    visibleSelectedCount={visibleSelectedCount}
                />

                <PromptManagementList
                    allVisibleSelected={allVisibleSelected}
                    prompts={prompts}
                    selectedIds={selectedIds}
                    setDeletePrompt={setDeletePrompt}
                    toggleAllVisible={toggleAllVisible}
                    togglePrompt={togglePrompt}
                />

                <Pagination prompts={prompts} />

                <CreationPanels
                    autoCategory={autoCategory}
                    imageAiConfiguration={imageAiConfiguration}
                    selectedFiles={selectedFiles}
                    setAutoCategory={setAutoCategory}
                    setSelectedFiles={setSelectedFiles}
                />
            </div>

            <DeletePromptDialog
                prompt={deletePrompt}
                onClose={() => setDeletePrompt(null)}
                onConfirm={deleteSelectedPrompt}
            />

            <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete selected prompts?</DialogTitle>
                        <DialogDescription>
                            This deletes {selectedIds.length} prompt
                            {selectedIds.length === 1 ? '' : 's'} and any
                            local thumbnail or reference image files.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setBulkDeleteOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => runBulkAction('delete')}
                        >
                            <Trash2 />
                            Delete selected
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

function AdminHeader({ total }: { total: number }) {
    return (
        <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    <SlidersHorizontal className="size-4" />
                    Admin workspace
                </div>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight">
                    Prompt Management
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Manage {total} prompt {total === 1 ? 'record' : 'records'}
                    with filters, editing, retry controls, and bulk actions.
                </p>
            </div>
            <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline">
                    <Link href={AdminPromptController.index()}>
                        <ListChecks />
                        Prompt list
                    </Link>
                </Button>
                <Button asChild>
                    <Link href={PromptController.index()}>
                        <Eye />
                        Public library
                    </Link>
                </Button>
            </div>
        </div>
    );
}

function ConfigurationAlerts({
    aiConfiguration,
    imageAiConfiguration,
}: {
    aiConfiguration: PromptAiConfiguration;
    imageAiConfiguration: PromptAiConfiguration;
}) {
    return (
        <>
            {!aiConfiguration.is_configured && (
                <Alert className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200">
                    <AlertCircle />
                    <AlertTitle>AI provider not configured</AlertTitle>
                    <AlertDescription>
                        {aiConfiguration.message ??
                            'Prompt generation cannot run until credentials are configured.'}
                    </AlertDescription>
                </Alert>
            )}

            {!imageAiConfiguration.is_configured && (
                <Alert className="border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-900/70 dark:bg-sky-950/40 dark:text-sky-100">
                    <ImageIcon />
                    <AlertTitle>Thumbnail image provider not configured</AlertTitle>
                    <AlertDescription>
                        {imageAiConfiguration.message ??
                            'Auto prompt thumbnails require OpenAI, Gemini, or xAI image generation credentials.'}
                    </AlertDescription>
                </Alert>
            )}
        </>
    );
}

function SummaryGrid({ summary }: { summary: PromptStatusSummary }) {
    const items = [
        { label: 'Total', value: summary.total, icon: Images },
        { label: 'Completed', value: summary.completed, icon: CheckCircle2 },
        { label: 'Pending', value: summary.pending, icon: Clock3 },
        { label: 'Processing', value: summary.processing, icon: LoaderCircle },
        { label: 'Failed', value: summary.failed, icon: AlertCircle },
        { label: 'Imported', value: summary.imported, icon: Bot },
        { label: 'Auto', value: summary.auto, icon: WandSparkles },
        { label: 'Reference', value: summary.reference_image, icon: ImageIcon },
        { label: 'Copies', value: summary.total_copies, icon: Copy },
        {
            label: 'Needs attention',
            value: summary.failed_needing_attention,
            icon: Filter,
        },
    ];

    return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {items.map((item) => {
                const Icon = item.icon;

                return (
                    <Card key={item.label} className="gap-3 rounded-lg py-4">
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
    );
}

function ManagementToolbar({
    activeFilters,
    categories,
    category,
    clearFilters,
    createdFrom,
    createdTo,
    generatedFrom,
    generatedTo,
    generationMode,
    generationModes,
    search,
    setCategory,
    setCreatedFrom,
    setCreatedTo,
    setGeneratedFrom,
    setGeneratedTo,
    setGenerationMode,
    setSearch,
    setSort,
    setSourceSite,
    setStatus,
    sort,
    sorts,
    sourceSite,
    sourceSites,
    status,
    statuses,
    submit,
    applyFilters,
}: {
    activeFilters: string[];
    categories: PromptCategory[];
    category: PromptCategory | 'all';
    clearFilters: () => void;
    createdFrom: string;
    createdTo: string;
    generatedFrom: string;
    generatedTo: string;
    generationMode: PromptGenerationMode | 'all';
    generationModes: PromptGenerationMode[];
    search: string;
    setCategory: (category: PromptCategory | 'all') => void;
    setCreatedFrom: (value: string) => void;
    setCreatedTo: (value: string) => void;
    setGeneratedFrom: (value: string) => void;
    setGeneratedTo: (value: string) => void;
    setGenerationMode: (mode: PromptGenerationMode | 'all') => void;
    setSearch: (search: string) => void;
    setSort: (sort: AdminSort) => void;
    setSourceSite: (sourceSite: SourceSiteFilter | 'all') => void;
    setStatus: (status: PromptStatus | 'all') => void;
    sort: AdminSort;
    sorts: AdminSort[];
    sourceSite: SourceSiteFilter | 'all';
    sourceSites: SourceSiteFilter[];
    status: PromptStatus | 'all';
    statuses: PromptStatus[];
    submit: (event: FormEvent<HTMLFormElement>) => void;
    applyFilters: () => void;
}) {
    return (
        <Card className="rounded-lg">
            <CardHeader className="gap-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Filter className="size-5" />
                            Filters
                        </CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Search and segment large prompt imports without
                            losing the current query string.
                        </p>
                    </div>
                    {activeFilters.length > 0 && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={clearFilters}
                        >
                            <X />
                            Reset filters
                        </Button>
                    )}
                </div>
                {activeFilters.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {activeFilters.map((filter) => (
                            <Badge key={filter} variant="secondary">
                                {filter}
                            </Badge>
                        ))}
                    </div>
                )}
            </CardHeader>
            <CardContent>
                <form onSubmit={submit} className="grid gap-3">
                    <div className="grid gap-3 lg:grid-cols-[minmax(18rem,1.4fr)_repeat(4,minmax(10rem,1fr))]">
                        <div className="relative min-w-0">
                            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                className="pl-9"
                                placeholder="Search title, prompt, source, errors"
                            />
                        </div>
                        <FilterSelect
                            label="Status"
                            value={status}
                            onChange={(value) =>
                                setStatus(value as PromptStatus | 'all')
                            }
                            options={statuses.map((option) => ({
                                value: option,
                                label: statusLabels[option],
                            }))}
                        />
                        <FilterSelect
                            label="Category"
                            value={category}
                            onChange={(value) =>
                                setCategory(value as PromptCategory | 'all')
                            }
                            options={categories.map((option) => ({
                                value: option,
                                label: categoryLabels[option],
                            }))}
                        />
                        <FilterSelect
                            label="Mode"
                            value={generationMode}
                            onChange={(value) =>
                                setGenerationMode(
                                    value as PromptGenerationMode | 'all',
                                )
                            }
                            options={generationModes.map((option) => ({
                                value: option,
                                label: generationModeLabels[option],
                            }))}
                        />
                        <FilterSelect
                            label="Source"
                            value={sourceSite}
                            onChange={(value) =>
                                setSourceSite(value as SourceSiteFilter | 'all')
                            }
                            options={sourceSites.map((option) => ({
                                value: option,
                                label: sourceSiteLabels[option],
                            }))}
                        />
                    </div>

                    <div className="grid gap-3 lg:grid-cols-[repeat(4,minmax(10rem,1fr))_minmax(10rem,1fr)_auto]">
                        <DateInput
                            label="Created from"
                            value={createdFrom}
                            onChange={setCreatedFrom}
                        />
                        <DateInput
                            label="Created to"
                            value={createdTo}
                            onChange={setCreatedTo}
                        />
                        <DateInput
                            label="Generated from"
                            value={generatedFrom}
                            onChange={setGeneratedFrom}
                        />
                        <DateInput
                            label="Generated to"
                            value={generatedTo}
                            onChange={setGeneratedTo}
                        />
                        <FilterSelect
                            label="Sort"
                            value={sort}
                            onChange={(value) => setSort(value as AdminSort)}
                            includeAll={false}
                            options={sorts.map((option) => ({
                                value: option,
                                label: sortLabels[option],
                            }))}
                        />
                        <div className="flex items-end gap-2">
                            <Button type="submit" className="w-full lg:w-auto">
                                <Search />
                                Apply
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                title="Refresh"
                                onClick={() => applyFilters()}
                            >
                                <RefreshCw />
                                <span className="sr-only">Refresh</span>
                            </Button>
                        </div>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

function FilterSelect({
    includeAll = true,
    label,
    onChange,
    options,
    value,
}: {
    includeAll?: boolean;
    label: string;
    onChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    value: string;
}) {
    return (
        <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">{label}</Label>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger className="w-full">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {includeAll && <SelectItem value="all">All</SelectItem>}
                    {options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

function DateInput({
    label,
    onChange,
    value,
}: {
    label: string;
    onChange: (value: string) => void;
    value: string;
}) {
    return (
        <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">{label}</Label>
            <Input
                type="date"
                value={value}
                onChange={(event) => onChange(event.target.value)}
            />
        </div>
    );
}

function BulkActionBar({
    bulkAction,
    bulkCategory,
    bulkStatus,
    categories,
    runBulkAction,
    selectedCount,
    setBulkAction,
    setBulkCategory,
    setBulkDeleteOpen,
    setBulkStatus,
    visibleSelectedCount,
}: {
    bulkAction: BulkAction;
    bulkCategory: PromptCategory;
    bulkStatus: PromptStatus;
    categories: PromptCategory[];
    runBulkAction: (action?: BulkAction) => void;
    selectedCount: number;
    setBulkAction: (action: BulkAction) => void;
    setBulkCategory: (category: PromptCategory) => void;
    setBulkDeleteOpen: (open: boolean) => void;
    setBulkStatus: (status: PromptStatus) => void;
    visibleSelectedCount: number;
}) {
    if (selectedCount === 0) {
        return (
            <div className="rounded-lg border border-dashed bg-muted/25 p-3 text-sm text-muted-foreground">
                Select prompts to enable bulk status, category, retry, or delete
                actions.
            </div>
        );
    }

    return (
        <div className="grid gap-3 rounded-lg border bg-card p-3 shadow-sm lg:grid-cols-[auto_auto_auto_1fr_auto] lg:items-center">
            <div className="flex items-center gap-2 text-sm font-medium">
                <ListChecks className="size-4" />
                {selectedCount} selected
                {visibleSelectedCount !== selectedCount && (
                    <span className="text-xs text-muted-foreground">
                        ({visibleSelectedCount} visible)
                    </span>
                )}
            </div>
            <Select
                value={bulkAction}
                onValueChange={(value) => setBulkAction(value as BulkAction)}
            >
                <SelectTrigger>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="status">Change status</SelectItem>
                    <SelectItem value="category">Change category</SelectItem>
                    <SelectItem value="retry">Retry generation</SelectItem>
                    <SelectItem value="delete">Delete</SelectItem>
                </SelectContent>
            </Select>
            {bulkAction === 'status' && (
                <Select
                    value={bulkStatus}
                    onValueChange={(value) =>
                        setBulkStatus(value as PromptStatus)
                    }
                >
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {Object.entries(statusLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                                {label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
            {bulkAction === 'category' && (
                <Select
                    value={bulkCategory}
                    onValueChange={(value) =>
                        setBulkCategory(value as PromptCategory)
                    }
                >
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {categories.map((option) => (
                            <SelectItem key={option} value={option}>
                                {categoryLabels[option]}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
            <div className="hidden lg:block" />
            <Button
                type="button"
                variant={bulkAction === 'delete' ? 'destructive' : 'default'}
                onClick={() =>
                    bulkAction === 'delete'
                        ? setBulkDeleteOpen(true)
                        : runBulkAction()
                }
            >
                {bulkAction === 'delete' ? <Trash2 /> : <CheckCircle2 />}
                Apply action
            </Button>
        </div>
    );
}

function PromptManagementList({
    allVisibleSelected,
    prompts,
    selectedIds,
    setDeletePrompt,
    toggleAllVisible,
    togglePrompt,
}: {
    allVisibleSelected: boolean;
    prompts: Paginated<AdminPromptItem>;
    selectedIds: number[];
    setDeletePrompt: (prompt: AdminPromptItem) => void;
    toggleAllVisible: (checked: boolean | 'indeterminate') => void;
    togglePrompt: (
        prompt: AdminPromptItem,
        checked: boolean | 'indeterminate',
    ) => void;
}) {
    if (prompts.data.length === 0) {
        return <AdminEmptyState />;
    }

    return (
        <Card className="overflow-hidden rounded-lg py-0">
            <div className="hidden overflow-x-auto xl:block">
                <div className="min-w-[1040px]">
                    <div className="grid grid-cols-[2.5rem_5rem_minmax(18rem,1.3fr)_9rem_9rem_8rem_7rem_9rem_9rem] gap-3 border-b bg-muted/40 px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                        <Checkbox
                            checked={allVisibleSelected}
                            onCheckedChange={toggleAllVisible}
                            aria-label="Select visible prompts"
                        />
                        <span>Image</span>
                        <span>Prompt</span>
                        <span>Status</span>
                        <span>Mode</span>
                        <span>Category</span>
                        <span>Copies</span>
                        <span>Generated</span>
                        <span className="text-right">Actions</span>
                    </div>
                    {prompts.data.map((prompt) => (
                        <PromptTableRow
                            key={prompt.id}
                            prompt={prompt}
                            selected={selectedIds.includes(prompt.id)}
                            setDeletePrompt={setDeletePrompt}
                            togglePrompt={togglePrompt}
                        />
                    ))}
                </div>
            </div>

            <div className="grid gap-3 p-3 xl:hidden">
                <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
                    <Checkbox
                        checked={allVisibleSelected}
                        onCheckedChange={toggleAllVisible}
                        aria-label="Select visible prompts"
                    />
                    Select visible prompts
                </div>
                {prompts.data.map((prompt) => (
                    <PromptMobileCard
                        key={prompt.id}
                        prompt={prompt}
                        selected={selectedIds.includes(prompt.id)}
                        setDeletePrompt={setDeletePrompt}
                        togglePrompt={togglePrompt}
                    />
                ))}
            </div>
        </Card>
    );
}

function PromptTableRow({
    prompt,
    selected,
    setDeletePrompt,
    togglePrompt,
}: {
    prompt: AdminPromptItem;
    selected: boolean;
    setDeletePrompt: (prompt: AdminPromptItem) => void;
    togglePrompt: (
        prompt: AdminPromptItem,
        checked: boolean | 'indeterminate',
    ) => void;
}) {
    return (
        <div className="grid grid-cols-[2.5rem_5rem_minmax(18rem,1.3fr)_9rem_9rem_8rem_7rem_9rem_9rem] gap-3 border-b px-4 py-3 last:border-b-0 hover:bg-muted/25">
            <div className="flex items-center">
                <Checkbox
                    checked={selected}
                    onCheckedChange={(checked) => togglePrompt(prompt, checked)}
                    aria-label={`Select ${prompt.title}`}
                />
            </div>
            <PromptThumb prompt={prompt} />
            <div className="min-w-0">
                <div className="flex min-w-0 items-start gap-2">
                    <Link
                        href={AdminPromptController.edit(prompt.id)}
                        className="line-clamp-1 font-medium hover:underline"
                    >
                        {prompt.title}
                    </Link>
                    {prompt.source_site && (
                        <Badge variant="outline" className="shrink-0">
                            {prompt.source_site}
                        </Badge>
                    )}
                </div>
                <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">
                    {prompt.prompt_preview ||
                        prompt.source_idea ||
                        prompt.error_message ||
                        'No prompt text yet.'}
                </p>
                {prompt.source_slug && (
                    <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                        {prompt.source_slug}
                    </p>
                )}
            </div>
            <div className="flex items-start">
                <StatusBadge status={prompt.status} />
            </div>
            <div>
                <GenerationModeBadge mode={prompt.generation_mode} />
                <p className="mt-1 truncate text-xs text-muted-foreground">
                    {providerLabel(prompt)}
                </p>
            </div>
            <div className="text-sm">
                {prompt.category ? categoryLabels[prompt.category] : 'None'}
            </div>
            <div className="text-sm tabular-nums">{prompt.copy_count}</div>
            <div className="text-sm text-muted-foreground">
                {formatDate(prompt.generated_at)}
            </div>
            <PromptActions prompt={prompt} setDeletePrompt={setDeletePrompt} />
        </div>
    );
}

function PromptMobileCard({
    prompt,
    selected,
    setDeletePrompt,
    togglePrompt,
}: {
    prompt: AdminPromptItem;
    selected: boolean;
    setDeletePrompt: (prompt: AdminPromptItem) => void;
    togglePrompt: (
        prompt: AdminPromptItem,
        checked: boolean | 'indeterminate',
    ) => void;
}) {
    return (
        <div className="grid gap-3 rounded-lg border bg-card p-3 shadow-sm sm:grid-cols-[7rem_minmax(0,1fr)]">
            <PromptThumb prompt={prompt} large />
            <div className="min-w-0 space-y-3">
                <div className="flex items-start gap-3">
                    <Checkbox
                        checked={selected}
                        onCheckedChange={(checked) =>
                            togglePrompt(prompt, checked)
                        }
                        aria-label={`Select ${prompt.title}`}
                    />
                    <div className="min-w-0 flex-1">
                        <Link
                            href={AdminPromptController.edit(prompt.id)}
                            className="line-clamp-2 font-medium hover:underline"
                        >
                            {prompt.title}
                        </Link>
                        <p className="mt-1 line-clamp-3 text-sm leading-5 text-muted-foreground">
                            {prompt.prompt_preview ||
                                prompt.source_idea ||
                                prompt.error_message ||
                                'No prompt text yet.'}
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <StatusBadge status={prompt.status} />
                    <GenerationModeBadge mode={prompt.generation_mode} />
                    {prompt.category && (
                        <Badge variant="secondary">
                            {categoryLabels[prompt.category]}
                        </Badge>
                    )}
                    <Badge variant="outline">
                        <Copy className="size-3" />
                        {prompt.copy_count}
                    </Badge>
                </div>
                <div className="grid gap-1 text-xs text-muted-foreground">
                    <span>Generated {formatDate(prompt.generated_at)}</span>
                    <span>{providerLabel(prompt)}</span>
                </div>
                <PromptActions prompt={prompt} setDeletePrompt={setDeletePrompt} />
            </div>
        </div>
    );
}

function PromptThumb({
    large = false,
    prompt,
}: {
    large?: boolean;
    prompt: AdminPromptItem;
}) {
    const className = large
        ? 'aspect-[4/3] w-full rounded-md object-cover'
        : 'aspect-square w-16 rounded-md object-cover';

    return prompt.thumbnail_url ? (
        <img
            src={prompt.thumbnail_url}
            alt={prompt.title}
            className={className}
            loading="lazy"
        />
    ) : (
        <PromptImagePlaceholder compact className={className} />
    );
}

function PromptActions({
    prompt,
    setDeletePrompt,
}: {
    prompt: AdminPromptItem;
    setDeletePrompt: (prompt: AdminPromptItem) => void;
}) {
    const [copiedText, copy] = useClipboard();
    const promptText = prompt.prompt ?? '';

    return (
        <div className="flex items-center justify-end gap-1">
            <Button asChild variant="ghost" size="icon" title="Edit prompt">
                <Link href={AdminPromptController.edit(prompt.id)}>
                    <Edit3 />
                    <span className="sr-only">Edit</span>
                </Link>
            </Button>
            <Button asChild variant="ghost" size="icon" title="View public page">
                <Link href={prompt.detail_url}>
                    <Eye />
                    <span className="sr-only">View</span>
                </Link>
            </Button>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                title="Copy prompt"
                onClick={() => copy(promptText)}
                disabled={promptText === ''}
            >
                {copiedText === promptText ? <CheckCircle2 /> : <Copy />}
                <span className="sr-only">Copy</span>
            </Button>
            {prompt.can_regenerate && (
                <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    title={
                        prompt.status === 'failed' ? 'Retry' : 'Regenerate'
                    }
                >
                    <Link
                        href={AdminPromptController.regenerate(prompt.id)}
                        as="button"
                        method="post"
                        preserveScroll
                    >
                        <RefreshCw />
                        <span className="sr-only">Retry</span>
                    </Link>
                </Button>
            )}
            <Button
                type="button"
                variant="ghost"
                size="icon"
                title="Delete"
                onClick={() => setDeletePrompt(prompt)}
            >
                <Trash2 />
                <span className="sr-only">Delete</span>
            </Button>
        </div>
    );
}

function CreationPanels({
    autoCategory,
    imageAiConfiguration,
    selectedFiles,
    setAutoCategory,
    setSelectedFiles,
}: {
    autoCategory: PromptCategory;
    imageAiConfiguration: PromptAiConfiguration;
    selectedFiles: string[];
    setAutoCategory: (category: PromptCategory) => void;
    setSelectedFiles: (files: string[]) => void;
}) {
    return (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)]">
            <AutoGeneratePromptPanel
                autoCategory={autoCategory}
                imageAiConfiguration={imageAiConfiguration}
                setAutoCategory={setAutoCategory}
            />

            <Card className="rounded-lg">
                <CardHeader>
                    <CardTitle>Reference uploads</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Upload one or more images and queue prompt generation.
                    </p>
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
                                .filter(([key]) => key.startsWith('images.'))
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
                                                        event.target.files ?? [],
                                                    ).map((file) => file.name),
                                                )
                                            }
                                        />
                                        {selectedFiles.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {selectedFiles.map((file) => (
                                                    <Badge
                                                        key={file}
                                                        variant="outline"
                                                    >
                                                        {file}
                                                    </Badge>
                                                ))}
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
        </div>
    );
}

function AutoGeneratePromptPanel({
    autoCategory,
    imageAiConfiguration,
    setAutoCategory,
}: {
    autoCategory: PromptCategory;
    imageAiConfiguration: PromptAiConfiguration;
    setAutoCategory: (category: PromptCategory) => void;
}) {
    return (
        <Card className="rounded-lg">
            <CardHeader className="gap-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                            <WandSparkles className="size-5" />
                            Auto generate prompt
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Create a prompt and thumbnail from a written
                            creative brief.
                        </p>
                    </div>
                    <Badge
                        variant="outline"
                        className={
                            imageAiConfiguration.is_configured
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300'
                        }
                    >
                        <Bot className="size-3.5" />
                        {imageAiConfiguration.is_configured
                            ? 'Image AI ready'
                            : 'Image AI missing'}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <Form
                    {...AdminPromptController.storeAuto.form()}
                    resetOnSuccess
                    onSuccess={() => setAutoCategory('portrait')}
                    className="grid gap-4"
                >
                    {({ errors, processing }) => (
                        <>
                            <input
                                type="hidden"
                                name="category"
                                value={autoCategory}
                            />

                            <div className="grid gap-2">
                                <Label htmlFor="idea">Topic or idea</Label>
                                <textarea
                                    id="idea"
                                    name="idea"
                                    rows={4}
                                    className="min-h-28 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="Example: cinematic portrait prompt for a replaceable subject in a rainy neon street"
                                />
                                {errors.idea && (
                                    <p className="text-sm text-destructive">
                                        {errors.idea}
                                    </p>
                                )}
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label>Category</Label>
                                    <Select
                                        value={autoCategory}
                                        onValueChange={(value) =>
                                            setAutoCategory(
                                                value as PromptCategory,
                                            )
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.keys(categoryLabels).map(
                                                (category) => (
                                                    <SelectItem
                                                        key={category}
                                                        value={category}
                                                    >
                                                        {
                                                            categoryLabels[
                                                                category as PromptCategory
                                                            ]
                                                        }
                                                    </SelectItem>
                                                ),
                                            )}
                                        </SelectContent>
                                    </Select>
                                    {errors.category && (
                                        <p className="text-sm text-destructive">
                                            {errors.category}
                                        </p>
                                    )}
                                </div>

                                <AdminInput
                                    error={errors.visual_style}
                                    id="visual_style"
                                    label="Visual style"
                                    placeholder="Editorial, cinematic, clean commercial"
                                />
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <AdminInput
                                    error={errors.subject}
                                    id="subject"
                                    label="Subject"
                                    placeholder="Replaceable person, product, or scene"
                                />
                                <AdminInput
                                    error={errors.mood}
                                    id="mood"
                                    label="Mood"
                                    placeholder="Elegant, bold, calm, surreal"
                                />
                                <AdminInput
                                    error={errors.lighting}
                                    id="lighting"
                                    label="Lighting"
                                    placeholder="Soft window light, neon rim light"
                                />
                                <AdminInput
                                    error={errors.camera_notes}
                                    id="camera_notes"
                                    label="Camera notes"
                                    placeholder="85mm portrait, low angle, macro"
                                />
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <AdminInput
                                    error={errors.target_model_notes}
                                    id="target_model_notes"
                                    label="Target model notes"
                                    placeholder="Midjourney, Flux, Imagen, DALL-E"
                                />
                                <AdminInput
                                    error={errors.negative_notes}
                                    id="negative_notes"
                                    label="Negative notes"
                                    placeholder="Avoid text, watermark, blur"
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-fit"
                                disabled={processing}
                            >
                                {processing ? (
                                    <LoaderCircle className="animate-spin" />
                                ) : (
                                    <WandSparkles />
                                )}
                                Generate with AI
                            </Button>
                        </>
                    )}
                </Form>
            </CardContent>
        </Card>
    );
}

function AdminInput({
    error,
    id,
    label,
    placeholder,
}: {
    error?: string;
    id: string;
    label: string;
    placeholder: string;
}) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={id}>{label}</Label>
            <Input id={id} name={id} placeholder={placeholder} />
            {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
    );
}

function DeletePromptDialog({
    onClose,
    onConfirm,
    prompt,
}: {
    onClose: () => void;
    onConfirm: () => void;
    prompt: AdminPromptItem | null;
}) {
    return (
        <Dialog open={prompt !== null} onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete prompt?</DialogTitle>
                    <DialogDescription>
                        This removes the database row and local image files. It
                        will not delete external source URLs.
                    </DialogDescription>
                </DialogHeader>
                {prompt && (
                    <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-3 rounded-lg border bg-muted/30 p-3">
                        <PromptThumb prompt={prompt} />
                        <div className="min-w-0">
                            <p className="line-clamp-2 text-sm font-medium">
                                {prompt.title}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {prompt.source_site
                                    ? `Source: ${prompt.source_site}`
                                    : 'Local prompt'}
                            </p>
                        </div>
                    </div>
                )}
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={onConfirm}
                    >
                        <Trash2 />
                        Delete prompt
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function AdminEmptyState() {
    return (
        <div className="flex min-h-72 items-center justify-center rounded-lg border border-dashed bg-card">
            <div className="max-w-md px-4 text-center">
                <div className="mx-auto mb-4 grid size-12 place-items-center rounded-lg border bg-muted">
                    <Search className="size-5 text-muted-foreground" />
                </div>
                <h2 className="text-base font-medium">No prompts found</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    Change the search, remove a filter, or return to the full
                    prompt list.
                </p>
                <Button asChild variant="outline" className="mt-4">
                    <Link href={AdminPromptController.index()}>
                        <X />
                        Clear filters
                    </Link>
                </Button>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: PromptStatus }) {
    const className =
        status === 'completed'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300'
            : status === 'failed'
              ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-300'
              : status === 'processing'
                ? 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/70 dark:bg-sky-950/40 dark:text-sky-300'
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

function GenerationModeBadge({ mode }: { mode: PromptGenerationMode }) {
    const Icon =
        mode === 'auto' ? WandSparkles : mode === 'imported' ? Bot : ImageIcon;

    return (
        <Badge variant="outline">
            <Icon className="size-3" />
            {generationModeLabels[mode]}
        </Badge>
    );
}

function Pagination({ prompts }: { prompts: Paginated<AdminPromptItem> }) {
    if (prompts.last_page <= 1) {
        return null;
    }

    return (
        <div className="flex flex-col gap-3 border-t pt-4 text-sm sm:flex-row sm:items-center sm:justify-between">
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

function providerLabel(prompt: AdminPromptItem): string {
    if (prompt.source_site) {
        return prompt.source_slug
            ? `${prompt.source_site} / ${prompt.source_slug}`
            : prompt.source_site;
    }

    if (prompt.ai_provider) {
        return prompt.ai_model
            ? `${prompt.ai_provider} / ${prompt.ai_model}`
            : prompt.ai_provider;
    }

    return prompt.user?.name ?? 'Local prompt';
}

function formatDate(value: string | null): string {
    return value ? value.slice(0, 10) : 'Not generated';
}

AdminPrompts.layout = {
    breadcrumbs: [
        {
            title: 'Prompt Management',
            href: AdminPromptController.index(),
        },
    ],
};
