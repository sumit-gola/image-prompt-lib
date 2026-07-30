import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    Check,
    Copy,
    LayoutDashboard,
    LogIn,
    Share2,
    Sparkles,
} from 'lucide-react';
import PromptController from '@/actions/App/Http/Controllers/PromptController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { usePromptActions } from '@/hooks/use-prompt-actions';
import { dashboard, home, login } from '@/routes';
import type {
    PromptCategory,
    PromptLibraryItem,
    PromptStyleNotes,
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
        'border-[#d85b37]/25 bg-[#d85b37]/10 text-[#87361f] dark:text-[#ffb49d]',
    product:
        'border-[#0f8f8a]/25 bg-[#0f8f8a]/10 text-[#075d5a] dark:text-[#82e6df]',
    fashion:
        'border-[#8f6bff]/25 bg-[#8f6bff]/10 text-[#5640a8] dark:text-[#c8baff]',
    lifestyle:
        'border-[#d7a928]/30 bg-[#d7a928]/12 text-[#765909] dark:text-[#f3d774]',
    art: 'border-[#2f6fb6]/25 bg-[#2f6fb6]/10 text-[#1f4f86] dark:text-[#9ccaff]',
    other: 'border-neutral-300 bg-neutral-100 text-neutral-700 dark:border-white/15 dark:bg-white/10 dark:text-neutral-200',
};

type Props = {
    promptItem: PromptLibraryItem;
};

export default function PromptShow({ promptItem }: Props) {
    const { auth } = usePage<{ auth: { user: User | null } }>().props;
    const {
        copiedValue,
        copyCount,
        copyPrompt,
        copyText,
        sharePrompt,
        shareStatus,
    } = usePromptActions(promptItem);
    const promptText = promptItem.prompt ?? '';
    const shareTitle =
        shareStatus === 'link-copied'
            ? 'Link copied'
            : shareStatus === 'shared'
              ? 'Shared'
              : 'Share prompt';

    return (
        <>
            <Head title={promptItem.title} />

            <div className="min-h-screen overflow-x-hidden bg-[#eef1ed] text-[#11120f] dark:bg-[#070807] dark:text-white">
                <header className="sticky top-0 z-40 border-b border-black/10 bg-[#11120f] text-white shadow-[0_14px_40px_rgba(17,18,15,0.22)]">
                    <div className="mx-auto flex max-w-[1580px] items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
                        <Link
                            href={home()}
                            className="flex min-w-0 flex-1 items-center gap-3 sm:flex-none"
                        >
                            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#f3efe5] text-[#11120f] shadow-[inset_0_-2px_0_rgba(0,0,0,0.18)]">
                                <Sparkles className="size-5" />
                            </span>
                            <span className="min-w-0">
                                <span className="block truncate text-lg font-semibold leading-5">
                                    Prompt Library
                                </span>
                                <span className="hidden truncate text-[11px] font-semibold uppercase text-white/48 sm:block">
                                    Prompt detail
                                </span>
                            </span>
                        </Link>

                        <div className="ml-auto flex items-center gap-2">
                            <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="h-10 rounded-lg border-white/12 bg-white/7 text-white hover:bg-white hover:text-[#11120f]"
                            >
                                <Link href={PromptController.index()}>
                                    Library
                                </Link>
                            </Button>
                            <Button
                                asChild
                                size="sm"
                                className="h-10 rounded-lg bg-white text-[#11120f] hover:bg-[#f3efe5]"
                            >
                                <Link href={auth.user ? dashboard() : login()}>
                                    {auth.user ? (
                                        <>
                                            <LayoutDashboard />
                                            <span className="hidden sm:inline">
                                                Dashboard
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <LogIn />
                                            <span className="hidden sm:inline">
                                                Login
                                            </span>
                                        </>
                                    )}
                                </Link>
                            </Button>
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-[1580px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                    <div className="mb-5">
                        <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="rounded-lg"
                        >
                            <Link href={home()} prefetch>
                                <ArrowLeft />
                                Back to prompts
                            </Link>
                        </Button>
                    </div>

                    <div className="grid gap-6 xl:grid-cols-[minmax(20rem,0.82fr)_minmax(0,1.18fr)]">
                        <section className="space-y-4">
                            <div className="overflow-hidden rounded-lg border border-[#cdd4cd] bg-[#fbfbf6] shadow-[0_24px_56px_rgba(17,18,15,0.14)] dark:border-white/10 dark:bg-white/7 dark:shadow-none">
                                <div className="relative">
                                    <img
                                        src={promptItem.reference_image_url}
                                        alt={promptItem.title}
                                        className="aspect-[4/5] w-full object-cover sm:aspect-[5/6] xl:aspect-[4/5]"
                                    />
                                    <div className="absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-2 p-3">
                                        {promptItem.category && (
                                            <Badge
                                                variant="outline"
                                                className={`bg-white/92 shadow-sm backdrop-blur dark:bg-[#11120f]/90 ${categoryThemes[promptItem.category]}`}
                                            >
                                                {
                                                    categoryLabels[
                                                        promptItem.category
                                                    ]
                                                }
                                            </Badge>
                                        )}
                                        <Badge className="ml-auto bg-[#11120f]/90 text-white shadow-sm backdrop-blur">
                                            Reference image
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            {promptItem.style_notes && (
                                <StyleNotes notes={promptItem.style_notes} />
                            )}
                        </section>

                        <section className="space-y-4">
                            <div className="rounded-lg border border-[#cdd4cd] bg-[#fbfbf6] p-4 shadow-[0_1px_0_rgba(17,18,15,0.06),0_16px_34px_rgba(17,18,15,0.08)] sm:p-5 dark:border-white/10 dark:bg-white/7 dark:shadow-none">
                                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                                    <div className="min-w-0 space-y-4">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge
                                                variant="outline"
                                                className="border-[#11120f] bg-[#11120f] text-white dark:border-white dark:bg-white dark:text-[#11120f]"
                                            >
                                                Prompt sheet
                                            </Badge>
                                            <Badge variant="outline">
                                                {formatGeneratedDate(
                                                    promptItem.generated_at,
                                                )}
                                            </Badge>
                                            <Badge variant="outline">
                                                <Copy className="size-3" />
                                                {formatCount(copyCount)} copied
                                            </Badge>
                                        </div>

                                        <div className="space-y-3">
                                            <h1 className="max-w-4xl text-3xl font-semibold tracking-normal sm:text-4xl">
                                                {promptItem.title}
                                            </h1>
                                            <p className="max-w-3xl border-l-2 border-[#009e91]/60 pl-3 text-sm leading-6 text-[#62675e] dark:text-white/66">
                                                {promptItem.prompt_preview}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 lg:justify-end">
                                        <Button
                                            type="button"
                                            className="h-11 flex-1 rounded-lg bg-[#11120f] text-white hover:bg-[#272923] sm:flex-none dark:bg-white dark:text-[#11120f] dark:hover:bg-neutral-200"
                                            onClick={() => void copyPrompt()}
                                            disabled={promptText === ''}
                                        >
                                            {copiedValue === promptText ? (
                                                <Check />
                                            ) : (
                                                <Copy />
                                            )}
                                            {copiedValue === promptText
                                                ? 'Copied'
                                                : 'Copy prompt'}
                                        </Button>

                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    title={shareTitle}
                                                    className="h-11 w-11 rounded-lg bg-white/80 dark:bg-white/7"
                                                    onClick={() =>
                                                        void sharePrompt()
                                                    }
                                                >
                                                    {shareStatus ===
                                                    'link-copied' ? (
                                                        <Check />
                                                    ) : (
                                                        <Share2 />
                                                    )}
                                                    <span className="sr-only">
                                                        {shareTitle}
                                                    </span>
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                {shareTitle}
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                </div>
                            </div>

                            <PromptPanel
                                title="Prompt"
                                value={promptText}
                                copied={copiedValue === promptText}
                                onCopy={() => void copyPrompt()}
                            />

                            {promptItem.negative_prompt && (
                                <PromptPanel
                                    title="Negative prompt"
                                    value={promptItem.negative_prompt}
                                    copied={
                                        copiedValue ===
                                        promptItem.negative_prompt
                                    }
                                    onCopy={() =>
                                        void copyText(
                                            promptItem.negative_prompt ?? '',
                                        )
                                    }
                                />
                            )}
                        </section>
                    </div>
                </main>
            </div>
        </>
    );
}

function PromptPanel({
    copied,
    onCopy,
    title,
    value,
}: {
    copied: boolean;
    onCopy: () => void;
    title: string;
    value: string;
}) {
    return (
        <section className="rounded-lg border border-[#cdd4cd] bg-[#fbfbf6] p-4 shadow-[0_1px_0_rgba(17,18,15,0.06),0_16px_34px_rgba(17,18,15,0.08)] sm:p-5 dark:border-white/10 dark:bg-white/7 dark:shadow-none">
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-[#d2d8d2] pb-3 dark:border-white/10">
                <h2 className="text-base font-semibold">{title}</h2>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-lg bg-white/80 dark:bg-white/7"
                    onClick={onCopy}
                    disabled={value === ''}
                >
                    {copied ? <Check /> : <Copy />}
                    {copied ? 'Copied' : 'Copy'}
                </Button>
            </div>
            <p className="whitespace-pre-wrap break-words text-sm leading-7 text-[#4f554d] dark:text-white/68">
                {value}
            </p>
        </section>
    );
}

function StyleNotes({ notes }: { notes: PromptStyleNotes }) {
    return (
        <section className="rounded-lg border border-[#cdd4cd] bg-[#fbfbf6] p-4 shadow-[0_1px_0_rgba(17,18,15,0.06),0_16px_34px_rgba(17,18,15,0.08)] sm:p-5 dark:border-white/10 dark:bg-white/7 dark:shadow-none">
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-[#d2d8d2] pb-3 dark:border-white/10">
                <h2 className="text-base font-semibold">Style notes</h2>
                <span className="text-xs font-semibold uppercase text-[#7b8076] dark:text-white/46">
                    Visual recipe
                </span>
            </div>
            <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                {Object.entries(notes).map(([key, value]) => (
                    <div
                        key={key}
                        className="grid min-w-0 gap-1 border-b border-[#d2d8d2] pb-3 last:border-b-0 last:pb-0 sm:border-b-0 sm:border-l sm:pl-3 sm:last:border-l xl:border-b xl:border-l-0 xl:pl-0 xl:last:border-b-0 2xl:border-b-0 2xl:border-l 2xl:pl-3 dark:border-white/10"
                    >
                        <dt className="text-xs font-semibold uppercase text-[#7b8076] dark:text-white/46">
                            {key.replace('_', ' ')}
                        </dt>
                        <dd className="break-words text-sm leading-6 text-[#3f453d] dark:text-white/74">
                            {value}
                        </dd>
                    </div>
                ))}
            </dl>
        </section>
    );
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
