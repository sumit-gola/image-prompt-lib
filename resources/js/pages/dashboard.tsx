import { Head, Link } from '@inertiajs/react';
import {
    AlertTriangle,
    CheckCircle2,
    Clock3,
    Images,
    LoaderCircle,
    ShieldCheck,
    UploadCloud,
} from 'lucide-react';
import AdminPromptController from '@/actions/App/Http/Controllers/AdminPromptController';
import PromptController from '@/actions/App/Http/Controllers/PromptController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dashboard } from '@/routes';
import type {
    DashboardPromptItem,
    PromptStatus,
    PromptStatusSummary,
} from '@/types';

type Props = {
    canManagePrompts: boolean;
    promptSummary: PromptStatusSummary;
    recentPrompts: DashboardPromptItem[];
};

const statusLabels: Record<PromptStatus, string> = {
    pending: 'Pending',
    processing: 'Processing',
    completed: 'Completed',
    failed: 'Failed',
};

export default function Dashboard({
    canManagePrompts,
    promptSummary,
    recentPrompts,
}: Props) {
    const summaryItems = [
        {
            label: 'Total',
            value: promptSummary.total,
            icon: Images,
        },
        {
            label: 'Pending',
            value: promptSummary.pending,
            icon: Clock3,
        },
        {
            label: 'Processing',
            value: promptSummary.processing,
            icon: LoaderCircle,
        },
        {
            label: 'Completed',
            value: promptSummary.completed,
            icon: CheckCircle2,
        },
        {
            label: 'Failed',
            value: promptSummary.failed,
            icon: AlertTriangle,
        },
    ];

    return (
        <>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto p-4">
                <div className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-2xl font-semibold tracking-normal">
                                Dashboard
                            </h1>
                            {canManagePrompts && (
                                <Badge variant="outline">
                                    <ShieldCheck />
                                    Admin
                                </Badge>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {promptSummary.total} prompt
                            {promptSummary.total === 1 ? '' : 's'}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {canManagePrompts && (
                            <Button asChild>
                                <Link href={AdminPromptController.index()}>
                                    <UploadCloud />
                                    Upload references
                                </Link>
                            </Button>
                        )}
                        <Button asChild variant="outline">
                            <Link href={PromptController.index()}>
                                <Images />
                                Prompt library
                            </Link>
                        </Button>
                    </div>
                </div>

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

                <section className="grid gap-4">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <h2 className="text-base font-semibold">
                            {canManagePrompts
                                ? 'Recent prompt jobs'
                                : 'Recent prompts'}
                        </h2>
                        {canManagePrompts && (
                            <Button asChild variant="outline" size="sm">
                                <Link href={AdminPromptController.index()}>
                                    Manage
                                </Link>
                            </Button>
                        )}
                    </div>

                    {recentPrompts.length > 0 ? (
                        <div className="grid gap-3 lg:grid-cols-2">
                            {recentPrompts.map((prompt) => (
                                <RecentPromptCard
                                    key={prompt.id}
                                    prompt={prompt}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="flex min-h-56 items-center justify-center rounded-lg border border-dashed">
                            <div className="text-center">
                                <h3 className="text-base font-medium">
                                    No prompts yet
                                </h3>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {canManagePrompts
                                        ? 'Upload references to start the queue.'
                                        : 'Completed prompts will appear here.'}
                                </p>
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </>
    );
}

function RecentPromptCard({ prompt }: { prompt: DashboardPromptItem }) {
    return (
        <Card className="overflow-hidden py-0">
            <div className="grid sm:grid-cols-[9rem_1fr]">
                <img
                    src={prompt.thumbnail_url}
                    alt={prompt.title}
                    className="aspect-[4/3] h-full w-full object-cover"
                    loading="lazy"
                />
                <CardContent className="flex min-h-36 flex-col gap-3 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={prompt.status} />
                        {prompt.category && (
                            <Badge variant="secondary">{prompt.category}</Badge>
                        )}
                    </div>
                    <h3 className="line-clamp-2 text-sm font-semibold">
                        {prompt.title}
                    </h3>
                    {prompt.status === 'failed' && prompt.error_message ? (
                        <p className="line-clamp-2 text-xs text-destructive">
                            {prompt.error_message}
                        </p>
                    ) : (
                        <p className="mt-auto text-xs text-muted-foreground">
                            {formatDate(prompt.generated_at ?? prompt.created_at)}
                        </p>
                    )}
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

function formatDate(value: string | null) {
    if (!value) {
        return 'Not generated';
    }

    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(new Date(value));
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};
