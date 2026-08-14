import { Form, Head, Link, router, usePoll } from '@inertiajs/react';
import {
    AlertCircle,
    Archive,
    BarChart3,
    Bot,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
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
    Send,
    SlidersHorizontal,
    Trash2,
    UploadCloud,
    WandSparkles,
    X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import AdminPromptController from '@/actions/App/Http/Controllers/AdminPromptController';
import PromptController from '@/actions/App/Http/Controllers/PromptController';
import { PromptImagePlaceholder } from '@/components/prompts/prompt-image-placeholder';
import { categoryLabels } from '@/components/prompts/prompt-library-config';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
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

type BulkAction =
    'publish' | 'draft' | 'status' | 'category' | 'retry' | 'delete';

type AdminPerPage = 24 | 48 | 96;

type ActiveFilter = {
    key: string;
    label: string;
    onRemove: () => void;
};

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
        per_page: AdminPerPage;
    };
    summary: PromptStatusSummary;
    aiConfiguration: PromptAiConfiguration;
    imageAiConfiguration: PromptAiConfiguration;
    requiresPolling: boolean;
};

const statusLabels: Record<PromptStatus, string> = {
    pending: 'Draft',
    processing: 'Processing',
    completed: 'Published',
    failed: 'Failed',
};

const generationModeLabels: Record<PromptGenerationMode, string> = {
    reference_image: 'Reference',
    auto: 'Auto generated',
    imported: 'Imported',
    variant: 'Variant',
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

const perPageOptions: AdminPerPage[] = [24, 48, 96];

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
    const [perPage, setPerPage] = useState<AdminPerPage>(
        filters.per_page ?? 24,
    );
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [bulkAction, setBulkAction] = useState<BulkAction>('publish');
    const [bulkStatus, setBulkStatus] = useState<PromptStatus>('completed');
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
            perPage: AdminPerPage;
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
            perPage,
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

        if (next.perPage !== 24) {
            query.per_page = String(next.perPage);
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
        setPerPage(24);
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
            perPage: 24,
        });
    };

    const activeFilters: ActiveFilter[] = [
        filters.search
            ? {
                  key: 'search',
                  label: `Search: ${filters.search}`,
                  onRemove: () => {
                      setSearch('');
                      applyFilters({ search: '' });
                  },
              }
            : null,
        filters.status
            ? {
                  key: 'status',
                  label: `Status: ${statusLabels[filters.status]}`,
                  onRemove: () => {
                      setStatus('all');
                      applyFilters({ status: 'all' });
                  },
              }
            : null,
        filters.category
            ? {
                  key: 'category',
                  label: `Category: ${categoryLabels[filters.category]}`,
                  onRemove: () => {
                      setCategory('all');
                      applyFilters({ category: 'all' });
                  },
              }
            : null,
        filters.generation_mode
            ? {
                  key: 'generation_mode',
                  label: `Mode: ${generationModeLabels[filters.generation_mode]}`,
                  onRemove: () => {
                      setGenerationMode('all');
                      applyFilters({ generationMode: 'all' });
                  },
              }
            : null,
        filters.source_site
            ? {
                  key: 'source_site',
                  label: `Source: ${sourceSiteLabels[filters.source_site]}`,
                  onRemove: () => {
                      setSourceSite('all');
                      applyFilters({ sourceSite: 'all' });
                  },
              }
            : null,
        filters.created_from
            ? {
                  key: 'created_from',
                  label: `Created from ${filters.created_from}`,
                  onRemove: () => {
                      setCreatedFrom('');
                      applyFilters({ createdFrom: '' });
                  },
              }
            : null,
        filters.created_to
            ? {
                  key: 'created_to',
                  label: `Created to ${filters.created_to}`,
                  onRemove: () => {
                      setCreatedTo('');
                      applyFilters({ createdTo: '' });
                  },
              }
            : null,
        filters.generated_from
            ? {
                  key: 'generated_from',
                  label: `Generated from ${filters.generated_from}`,
                  onRemove: () => {
                      setGeneratedFrom('');
                      applyFilters({ generatedFrom: '' });
                  },
              }
            : null,
        filters.generated_to
            ? {
                  key: 'generated_to',
                  label: `Generated to ${filters.generated_to}`,
                  onRemove: () => {
                      setGeneratedTo('');
                      applyFilters({ generatedTo: '' });
                  },
              }
            : null,
        filters.sort !== 'newest'
            ? {
                  key: 'sort',
                  label: `Sort: ${sortLabels[filters.sort]}`,
                  onRemove: () => {
                      setSort('newest');
                      applyFilters({ sort: 'newest' });
                  },
              }
            : null,
    ].filter((filter): filter is ActiveFilter => filter !== null);

    const allVisibleSelected =
        prompts.data.length > 0 &&
        prompts.data.every((prompt) => selectedIds.includes(prompt.id));

    const visibleSelectedCount = prompts.data.filter((prompt) =>
        selectedIds.includes(prompt.id),
    ).length;

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

            <div className="flex h-full flex-1 flex-col gap-3 overflow-x-hidden bg-[linear-gradient(135deg,rgb(248_250_252),rgb(255_255_255),rgb(239_246_255))] p-3 sm:p-4 dark:bg-background">
                <AdminHeader summary={summary} total={prompts.total} />

                <SummaryGrid
                    aiConfiguration={aiConfiguration}
                    imageAiConfiguration={imageAiConfiguration}
                    summary={summary}
                />

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
                    clearSelection={() => setSelectedIds([])}
                    setBulkAction={setBulkAction}
                    setBulkCategory={setBulkCategory}
                    setBulkDeleteOpen={setBulkDeleteOpen}
                    setBulkStatus={setBulkStatus}
                    visibleSelectedCount={visibleSelectedCount}
                />

                <Pagination
                    onPerPageChange={(value) => {
                        setPerPage(value);
                        applyFilters({ perPage: value });
                    }}
                    perPage={perPage}
                    prompts={prompts}
                    tone="top"
                />

                <PromptManagementList
                    allVisibleSelected={allVisibleSelected}
                    prompts={prompts}
                    selectedIds={selectedIds}
                    setDeletePrompt={setDeletePrompt}
                    toggleAllVisible={toggleAllVisible}
                    togglePrompt={togglePrompt}
                />

                <Pagination
                    onPerPageChange={(value) => {
                        setPerPage(value);
                        applyFilters({ perPage: value });
                    }}
                    perPage={perPage}
                    prompts={prompts}
                    tone="bottom"
                />

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
                            {selectedIds.length === 1 ? '' : 's'} and any local
                            thumbnail or reference image files.
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

function AdminHeader({
    summary,
    total,
}: {
    summary: PromptStatusSummary;
    total: number;
}) {
    return (
        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white/80 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex flex-col gap-3 bg-[linear-gradient(120deg,rgb(255_255_255_/_0.92),rgb(240_249_255_/_0.82),rgb(245_243_255_/_0.72))] p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between dark:bg-[linear-gradient(120deg,rgb(15_23_42_/_0.92),rgb(30_41_59_/_0.72),rgb(49_46_129_/_0.24))]">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge
                            variant="outline"
                            className="rounded-full border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700 uppercase dark:border-sky-900/70 dark:bg-sky-950/50 dark:text-sky-300"
                        >
                            <SlidersHorizontal className="size-3.5" />
                            Prompt Ops
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                            {formatNumber(total)} prompt records
                        </span>
                    </div>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
                        <h1 className="text-2xl leading-none font-semibold tracking-tight sm:text-3xl">
                            Prompt Management
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Manage {formatNumber(total)} prompt{' '}
                            {total === 1 ? 'record' : 'records'} with filters,
                            editing, retry controls, and bulk actions.
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <HeaderChip label="Published" value={summary.completed} />
                    <HeaderChip
                        label="Attention"
                        tone={
                            summary.failed_needing_attention > 0
                                ? 'danger'
                                : 'muted'
                        }
                        value={summary.failed_needing_attention}
                    />
                    <Button asChild variant="outline" size="sm">
                        <Link href={AdminPromptController.index()}>
                            <ListChecks />
                            Prompt list
                        </Link>
                    </Button>
                    <Button asChild size="sm">
                        <Link href={PromptController.index()}>
                            <Eye />
                            Public library
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}

function HeaderChip({
    label,
    tone = 'muted',
    value,
}: {
    label: string;
    tone?: 'danger' | 'muted';
    value: number;
}) {
    return (
        <div
            className={
                tone === 'danger'
                    ? 'rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-300'
                    : 'rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-xs text-muted-foreground shadow-sm dark:border-white/10 dark:bg-white/[0.05]'
            }
        >
            <span className="font-semibold text-foreground">
                {formatNumber(value)}
            </span>{' '}
            {label}
        </div>
    );
}

function SummaryGrid({
    aiConfiguration,
    imageAiConfiguration,
    summary,
}: {
    aiConfiguration: PromptAiConfiguration;
    imageAiConfiguration: PromptAiConfiguration;
    summary: PromptStatusSummary;
}) {
    const statusItems = [
        {
            label: statusLabels.completed,
            value: summary.completed,
            className: 'bg-emerald-500',
        },
        {
            label: statusLabels.pending,
            value: summary.pending,
            className: 'bg-amber-400',
        },
        {
            label: 'Processing',
            value: summary.processing,
            className: 'bg-sky-500',
        },
        { label: 'Failed', value: summary.failed, className: 'bg-rose-500' },
    ];
    const sourceItems = [
        { label: 'Imported', value: summary.imported, icon: Bot },
        { label: 'Auto', value: summary.auto, icon: WandSparkles },
        { label: 'Reference', value: summary.reference_image, icon: ImageIcon },
    ];
    const hasAlerts =
        !aiConfiguration.is_configured || !imageAiConfiguration.is_configured;

    return (
        <section className="rounded-xl border border-slate-200/80 bg-white/72 p-3 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
            <div className="grid gap-3 xl:grid-cols-[minmax(24rem,1.25fr)_minmax(18rem,0.95fr)_minmax(15rem,0.7fr)]">
                <div className="rounded-lg border border-slate-200/80 bg-white/70 p-3 dark:border-white/10 dark:bg-white/[0.04]">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <div className="text-xs font-semibold text-muted-foreground uppercase">
                                Status distribution
                            </div>
                            <div className="mt-1 text-2xl font-semibold">
                                {formatNumber(summary.total)}
                            </div>
                        </div>
                        <BarChart3 className="size-5 text-sky-600" />
                    </div>
                    <SegmentedBar items={statusItems} total={summary.total} />
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {statusItems.map((item) => (
                            <MiniMetric
                                key={item.label}
                                colorClass={item.className}
                                label={item.label}
                                value={item.value}
                            />
                        ))}
                    </div>
                </div>

                <div className="rounded-lg border border-slate-200/80 bg-[linear-gradient(135deg,rgb(255_255_255_/_0.78),rgb(248_250_252_/_0.88))] p-3 dark:border-white/10 dark:bg-white/[0.04]">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-xs font-semibold text-muted-foreground uppercase">
                            Source mix
                        </div>
                        <Images className="size-4 text-muted-foreground" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {sourceItems.map((item) => {
                            const Icon = item.icon;

                            return (
                                <div
                                    key={item.label}
                                    className="rounded-lg border border-slate-200/70 bg-white/70 p-2 dark:border-white/10 dark:bg-white/[0.04]"
                                >
                                    <Icon className="mb-2 size-4 text-muted-foreground" />
                                    <div className="text-lg font-semibold">
                                        {formatNumber(item.value)}
                                    </div>
                                    <div className="truncate text-[11px] text-muted-foreground">
                                        {item.label}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                    <InfographicTile
                        icon={Copy}
                        label="Copies"
                        value={summary.total_copies}
                    />
                    <InfographicTile
                        icon={AlertCircle}
                        label="Needs attention"
                        tone={
                            summary.failed_needing_attention > 0
                                ? 'danger'
                                : 'default'
                        }
                        value={summary.failed_needing_attention}
                    />
                </div>
            </div>

            {hasAlerts && (
                <div className="mt-3 grid gap-2 lg:grid-cols-2">
                    {!aiConfiguration.is_configured && (
                        <CompactAlert
                            icon={AlertCircle}
                            message={
                                aiConfiguration.message ??
                                'Prompt generation cannot run until credentials are configured.'
                            }
                            title="AI provider not configured"
                            tone="amber"
                        />
                    )}
                    {!imageAiConfiguration.is_configured && (
                        <CompactAlert
                            icon={ImageIcon}
                            message={
                                imageAiConfiguration.message ??
                                'Auto prompt thumbnails require image generation credentials.'
                            }
                            title="Thumbnail provider not configured"
                            tone="sky"
                        />
                    )}
                </div>
            )}
        </section>
    );
}

function SegmentedBar({
    items,
    total,
}: {
    items: Array<{ className: string; label: string; value: number }>;
    total: number;
}) {
    return (
        <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
            {items.map((item) => (
                <div
                    key={item.label}
                    className={item.className}
                    style={{ width: `${percentage(item.value, total)}%` }}
                    title={`${item.label}: ${formatNumber(item.value)}`}
                />
            ))}
        </div>
    );
}

function MiniMetric({
    colorClass,
    label,
    value,
}: {
    colorClass: string;
    label: string;
    value: number;
}) {
    return (
        <div className="min-w-0">
            <div className="flex items-center gap-1.5">
                <span className={`size-2 rounded-full ${colorClass}`} />
                <span className="truncate text-[11px] text-muted-foreground">
                    {label}
                </span>
            </div>
            <div className="mt-1 text-sm font-semibold tabular-nums">
                {formatNumber(value)}
            </div>
        </div>
    );
}

function InfographicTile({
    icon: Icon,
    label,
    tone = 'default',
    value,
}: {
    icon: LucideIcon;
    label: string;
    tone?: 'danger' | 'default';
    value: number;
}) {
    return (
        <div
            className={
                tone === 'danger'
                    ? 'rounded-lg border border-rose-200 bg-rose-50/90 p-3 text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-300'
                    : 'rounded-lg border border-slate-200/80 bg-white/70 p-3 dark:border-white/10 dark:bg-white/[0.04]'
            }
        >
            <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase">
                    {label}
                </div>
                <Icon className="size-4" />
            </div>
            <div className="mt-2 text-2xl font-semibold tabular-nums">
                {formatNumber(value)}
            </div>
        </div>
    );
}

function CompactAlert({
    icon: Icon,
    message,
    title,
    tone,
}: {
    icon: LucideIcon;
    message: string;
    title: string;
    tone: 'amber' | 'sky';
}) {
    return (
        <div
            className={
                tone === 'amber'
                    ? 'flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/85 px-3 py-2 text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200'
                    : 'flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50/85 px-3 py-2 text-sky-950 dark:border-sky-900/70 dark:bg-sky-950/40 dark:text-sky-100'
            }
        >
            <Icon className="mt-0.5 size-4 shrink-0" />
            <div className="min-w-0">
                <div className="text-sm font-semibold">{title}</div>
                <div className="line-clamp-2 text-xs opacity-80">{message}</div>
            </div>
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
    activeFilters: ActiveFilter[];
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
    const dateFiltersActive =
        createdFrom !== '' ||
        createdTo !== '' ||
        generatedFrom !== '' ||
        generatedTo !== '';
    const [advancedOpen, setAdvancedOpen] = useState(dateFiltersActive);

    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/72 shadow-sm ring-1 ring-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:ring-white/5">
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                <form onSubmit={submit} className="grid gap-2 p-2">
                    <div className="grid items-center gap-2 lg:grid-cols-[minmax(16rem,1.35fr)_repeat(5,minmax(7.25rem,0.7fr))_auto]">
                        <div className="relative min-w-0">
                            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                className="h-10 rounded-full border-slate-200 bg-white/88 pl-9 shadow-xs placeholder:text-slate-400 dark:border-white/10 dark:bg-white/[0.04]"
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
                        <div className="grid grid-cols-[1fr_auto] gap-2">
                            <Button
                                type="submit"
                                className="h-10 rounded-full px-4"
                            >
                                <Search />
                                Apply
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-10 w-10 shrink-0 rounded-full bg-white/88"
                                title="Refresh"
                                onClick={() => applyFilters()}
                            >
                                <RefreshCw />
                                <span className="sr-only">Refresh</span>
                            </Button>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/70 pt-2 dark:border-white/10">
                        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                            <span className="flex h-7 items-center gap-1.5 rounded-full border border-cyan-200 bg-cyan-50 px-2.5 text-[11px] font-semibold text-cyan-700 uppercase dark:border-cyan-900/70 dark:bg-cyan-950/40 dark:text-cyan-300">
                                <Filter className="size-3.5" />
                                Filter deck
                            </span>
                            {activeFilters.length === 0 ? (
                                <span className="h-7 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-muted-foreground dark:border-white/10 dark:bg-white/[0.04]">
                                    No active filters
                                </span>
                            ) : (
                                activeFilters.map((filter) => (
                                    <button
                                        key={filter.key}
                                        type="button"
                                        className="group flex h-7 max-w-full items-center gap-1 rounded-full border border-slate-200 bg-white/88 px-2.5 text-[11px] text-slate-700 shadow-xs transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200"
                                        onClick={filter.onRemove}
                                        title={`Remove ${filter.label}`}
                                    >
                                        <span className="truncate">
                                            {filter.label}
                                        </span>
                                        <X className="size-3 text-muted-foreground group-hover:text-foreground" />
                                    </button>
                                ))
                            )}
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                            <CollapsibleTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className={
                                        dateFiltersActive
                                            ? 'h-8 rounded-full border-sky-200 bg-sky-50 px-3 text-xs text-sky-700 dark:border-sky-900/70 dark:bg-sky-950/40 dark:text-sky-300'
                                            : 'h-8 rounded-full bg-white/88 px-3 text-xs'
                                    }
                                >
                                    <SlidersHorizontal />
                                    Dates
                                    <ChevronDown
                                        className={
                                            advancedOpen
                                                ? 'rotate-180 transition-transform'
                                                : 'transition-transform'
                                        }
                                    />
                                </Button>
                            </CollapsibleTrigger>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={clearFilters}
                                disabled={activeFilters.length === 0}
                                className="h-8 rounded-full bg-white/88 px-3 text-xs"
                            >
                                <X />
                                Reset
                            </Button>
                        </div>
                    </div>

                    <CollapsibleContent>
                        <div className="grid gap-2 rounded-xl border border-sky-100 bg-[linear-gradient(135deg,rgb(240_249_255_/_0.72),rgb(255_255_255_/_0.9))] p-2 md:grid-cols-2 xl:grid-cols-[auto_repeat(4,minmax(9rem,1fr))] dark:border-sky-900/40 dark:bg-white/[0.03]">
                            <div className="flex items-center gap-2 rounded-lg bg-white/72 px-2.5 py-2 text-xs font-semibold text-sky-700 uppercase dark:bg-white/[0.04] dark:text-sky-300">
                                <SlidersHorizontal className="size-4" />
                                Date windows
                            </div>
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
                        </div>
                    </CollapsibleContent>
                </form>
            </Collapsible>
        </section>
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
        <div className="grid min-w-0 gap-1">
            <Label className="sr-only">{label}</Label>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger
                    className="h-10 w-full rounded-full border-slate-200 bg-white/88 px-3 text-sm shadow-xs dark:border-white/10 dark:bg-white/[0.04]"
                    title={label}
                >
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
        <div className="grid min-w-0 gap-1">
            <Label className="text-[11px] font-medium text-muted-foreground">
                {label}
            </Label>
            <Input
                type="date"
                value={value}
                className="h-9 rounded-lg border-slate-200 bg-white/88 text-sm shadow-xs dark:border-white/10 dark:bg-white/[0.04]"
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
    clearSelection,
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
    clearSelection: () => void;
    runBulkAction: (action?: BulkAction) => void;
    selectedCount: number;
    setBulkAction: (action: BulkAction) => void;
    setBulkCategory: (category: PromptCategory) => void;
    setBulkDeleteOpen: (open: boolean) => void;
    setBulkStatus: (status: PromptStatus) => void;
    visibleSelectedCount: number;
}) {
    const applyLabel =
        bulkAction === 'publish'
            ? 'Publish'
            : bulkAction === 'draft'
              ? 'Move to draft'
              : bulkAction === 'delete'
                ? 'Delete'
                : bulkAction === 'retry'
                  ? 'Retry'
                  : 'Apply';
    const ApplyIcon =
        bulkAction === 'publish'
            ? Send
            : bulkAction === 'draft'
              ? Archive
              : bulkAction === 'delete'
                ? Trash2
                : bulkAction === 'retry'
                  ? RefreshCw
                  : CheckCircle2;

    if (selectedCount === 0) {
        return (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-full border border-slate-200/80 bg-white/62 px-3 py-1.5 text-xs text-muted-foreground shadow-xs backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]">
                <span className="flex items-center gap-1.5">
                    <ListChecks className="size-3.5" />
                    Select rows for bulk actions
                </span>
                <span className="hidden items-center gap-1.5 sm:flex">
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        Publish
                    </span>
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                        Draft
                    </span>
                    <span>status, category, retry, delete</span>
                </span>
            </div>
        );
    }

    return (
        <div className="sticky top-2 z-20 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/94 p-2 shadow-lg ring-1 shadow-slate-200/60 ring-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-background/90 dark:shadow-black/30 dark:ring-white/5">
            <div className="flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 text-sm font-medium dark:border-white/10 dark:bg-white/[0.05]">
                <span className="grid size-6 place-items-center rounded-full bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                    <ListChecks className="size-4" />
                </span>
                {formatNumber(selectedCount)} selected
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
                <SelectTrigger className="h-9 w-[11.25rem] rounded-full bg-white/88">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="publish">Publish selected</SelectItem>
                    <SelectItem value="draft">Move to draft</SelectItem>
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
                    <SelectTrigger className="h-9 w-[10rem] rounded-full bg-white/88">
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
                    <SelectTrigger className="h-9 w-[10rem] rounded-full bg-white/88">
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
            <div className="min-w-0 flex-1" />
            <Button
                type="button"
                size="sm"
                variant={bulkAction === 'delete' ? 'destructive' : 'default'}
                className="h-9 rounded-full px-4"
                onClick={() =>
                    bulkAction === 'delete'
                        ? setBulkDeleteOpen(true)
                        : runBulkAction()
                }
            >
                <ApplyIcon />
                {applyLabel}
            </Button>
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearSelection}
                className="h-9 rounded-full bg-white/88"
            >
                <X />
                Clear
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
        <Card className="overflow-hidden rounded-xl border-slate-200/80 bg-white/86 py-0 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
            <div className="hidden overflow-x-auto xl:block">
                <div className="min-w-[1080px]">
                    <div className="sticky top-0 z-10 grid grid-cols-[2.25rem_4rem_minmax(18rem,1.45fr)_8rem_8rem_8rem_6rem_8rem_10rem] gap-2 border-b bg-slate-50/95 px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase backdrop-blur dark:bg-background/95">
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

            <div className="grid gap-2 p-2 xl:hidden">
                <div className="flex items-center gap-2 rounded-lg border bg-slate-50/80 p-2 text-sm dark:bg-white/[0.04]">
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
        <div className="grid grid-cols-[2.25rem_4rem_minmax(18rem,1.45fr)_8rem_8rem_8rem_6rem_8rem_10rem] items-center gap-2 border-b px-3 py-2 last:border-b-0 hover:bg-sky-50/45 dark:hover:bg-white/[0.04]">
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
                <p className="mt-0.5 line-clamp-1 text-xs leading-5 text-muted-foreground">
                    {prompt.prompt_preview ||
                        prompt.source_idea ||
                        prompt.error_message ||
                        'No prompt text yet.'}
                </p>
                {prompt.source_slug && (
                    <p className="truncate font-mono text-[11px] text-muted-foreground">
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
            <div className="truncate text-sm">
                {prompt.category ? categoryLabels[prompt.category] : 'None'}
            </div>
            <div className="text-sm tabular-nums">
                {formatNumber(prompt.copy_count)}
            </div>
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
        <div className="grid gap-2 rounded-lg border bg-white/82 p-2 shadow-sm sm:grid-cols-[5.5rem_minmax(0,1fr)] dark:bg-white/[0.04]">
            <PromptThumb prompt={prompt} large />
            <div className="min-w-0 space-y-2">
                <div className="flex items-start gap-2">
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
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                            {prompt.prompt_preview ||
                                prompt.source_idea ||
                                prompt.error_message ||
                                'No prompt text yet.'}
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    <StatusBadge status={prompt.status} />
                    <GenerationModeBadge mode={prompt.generation_mode} />
                    {prompt.category && (
                        <Badge variant="secondary">
                            {categoryLabels[prompt.category]}
                        </Badge>
                    )}
                    <Badge variant="outline">
                        <Copy className="size-3" />
                        {formatNumber(prompt.copy_count)}
                    </Badge>
                </div>
                <div className="grid gap-0.5 text-xs text-muted-foreground">
                    <span>Generated {formatDate(prompt.generated_at)}</span>
                    <span>{providerLabel(prompt)}</span>
                </div>
                <PromptActions
                    prompt={prompt}
                    setDeletePrompt={setDeletePrompt}
                />
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
        : 'size-12 rounded-md object-cover';

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
    const visibilityAction: BulkAction =
        prompt.status === 'completed' ? 'draft' : 'publish';
    const visibilityDisabled =
        visibilityAction === 'publish' && promptText.trim() === '';
    const VisibilityIcon = visibilityAction === 'publish' ? Send : Archive;
    const updateVisibility = () => {
        if (visibilityDisabled) {
            return;
        }

        router.patch(
            AdminPromptController.bulk(),
            {
                action: visibilityAction,
                prompt_ids: [prompt.id],
            },
            { preserveScroll: true },
        );
    };

    return (
        <div className="flex items-center justify-end gap-1">
            <Button asChild variant="ghost" size="icon" title="Edit prompt">
                <Link href={AdminPromptController.edit(prompt.id)}>
                    <Edit3 />
                    <span className="sr-only">Edit</span>
                </Link>
            </Button>
            <Button
                asChild
                variant="ghost"
                size="icon"
                title="View public page"
            >
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
            <Button
                type="button"
                variant="ghost"
                size="icon"
                title={
                    visibilityAction === 'publish'
                        ? 'Publish prompt'
                        : 'Move to draft'
                }
                onClick={updateVisibility}
                disabled={visibilityDisabled}
            >
                <VisibilityIcon />
                <span className="sr-only">
                    {visibilityAction === 'publish' ? 'Publish' : 'Draft'}
                </span>
            </Button>
            {prompt.can_regenerate && (
                <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    title={prompt.status === 'failed' ? 'Retry' : 'Regenerate'}
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
                                                        event.target.files ??
                                                            [],
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
                                    className="min-h-28 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
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
        <Dialog
            open={prompt !== null}
            onOpenChange={(open) => !open && onClose()}
        >
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

function Pagination({
    onPerPageChange,
    perPage,
    prompts,
    tone,
}: {
    onPerPageChange: (value: AdminPerPage) => void;
    perPage: AdminPerPage;
    prompts: Paginated<AdminPromptItem>;
    tone: 'bottom' | 'top';
}) {
    if (prompts.total === 0) {
        return null;
    }

    return (
        <div
            className={
                tone === 'top'
                    ? 'flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200/80 bg-white/74 px-2 py-1.5 text-sm shadow-sm ring-1 ring-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:ring-white/5'
                    : 'flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200/70 bg-white/54 px-2 py-1.5 text-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.03]'
            }
        >
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="rounded-full bg-slate-950 px-2.5 py-1 font-semibold text-white tabular-nums dark:bg-white dark:text-slate-950">
                    {formatNumber(prompts.from ?? 0)}-
                    {formatNumber(prompts.to ?? 0)}
                </span>
                <span className="rounded-full border border-slate-200 bg-white/80 px-2.5 py-1 text-muted-foreground dark:border-white/10 dark:bg-white/[0.04]">
                    of {formatNumber(prompts.total)}
                </span>
                <span className="rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 font-medium text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-300">
                    Page {formatNumber(prompts.current_page)} of{' '}
                    {formatNumber(prompts.last_page)}
                </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <Select
                    value={String(perPage)}
                    onValueChange={(value) =>
                        onPerPageChange(Number(value) as AdminPerPage)
                    }
                >
                    <SelectTrigger className="h-8 w-[7.25rem] rounded-full bg-white/88 text-xs shadow-xs dark:bg-white/[0.04]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {perPageOptions.map((option) => (
                            <SelectItem key={option} value={String(option)}>
                                {option} / page
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-full bg-white/88 px-3"
                    disabled={!prompts.prev_page_url}
                >
                    {prompts.prev_page_url ? (
                        <Link href={prompts.prev_page_url}>
                            <ChevronLeft />
                            Previous
                        </Link>
                    ) : (
                        <span>
                            <ChevronLeft />
                            Previous
                        </span>
                    )}
                </Button>
                <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-full bg-white/88 px-3"
                    disabled={!prompts.next_page_url}
                >
                    {prompts.next_page_url ? (
                        <Link href={prompts.next_page_url}>
                            Next
                            <ChevronRight />
                        </Link>
                    ) : (
                        <span>
                            Next
                            <ChevronRight />
                        </span>
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

function formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US').format(value);
}

function percentage(value: number, total: number): number {
    if (total <= 0 || value <= 0) {
        return 0;
    }

    return Math.max((value / total) * 100, 1.5);
}

AdminPrompts.layout = {
    breadcrumbs: [
        {
            title: 'Prompt Management',
            href: AdminPromptController.index(),
        },
    ],
};
