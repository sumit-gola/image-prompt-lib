import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Check, Copy, Eye, Share2, Sparkles } from 'lucide-react';
import PromptController from '@/actions/App/Http/Controllers/PromptController';
import { PromptCard } from '@/components/prompts/prompt-card';
import { PromptImagePlaceholder } from '@/components/prompts/prompt-image-placeholder';
import {
    categoryBadgeClasses,
    categoryLabels,
    formatCount,
    formatGeneratedDate,
} from '@/components/prompts/prompt-library-config';
import {
    PromptTextPanel,
    StyleNotesPanel,
} from '@/components/prompts/prompt-text-panel';
import { PublicPromptShell } from '@/components/prompts/public-prompt-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { usePromptActions } from '@/hooks/use-prompt-actions';
import { home } from '@/routes';
import type { PromptCategory, PromptLibraryItem } from '@/types';

type Props = {
    promptItem: PromptLibraryItem;
    categories: PromptCategory[];
    categoryCounts: Record<PromptCategory, number>;
    relatedPrompts: PromptLibraryItem[];
};

export default function PromptShow({
    promptItem,
    categories,
    categoryCounts,
    relatedPrompts,
}: Props) {
    const totalCompleted = Object.values(categoryCounts).reduce(
        (sum, count) => sum + count,
        0,
    );
    const {
        copiedValue,
        copyCount,
        copyPrompt,
        copyText,
        sharePrompt,
        shareStatus,
    } = usePromptActions(promptItem);
    const promptText = promptItem.prompt ?? '';
    const displayImageUrl =
        promptItem.reference_image_url ?? promptItem.thumbnail_url;
    const shareTitle =
        shareStatus === 'link-copied'
            ? 'Link copied'
            : shareStatus === 'shared'
              ? 'Shared'
              : 'Share prompt';

    return (
        <>
            <Head>
                <title>{promptItem.title}</title>
                <meta
                    head-key="description"
                    name="description"
                    content={promptItem.prompt_preview}
                />
            </Head>

            <PublicPromptShell
                activeCategory={promptItem.category}
                activeSort="newest"
                categories={categories}
                categoryCounts={categoryCounts}
                suggestedPrompts={relatedPrompts}
                totalCompleted={totalCompleted}
                trends={[]}
            >
                <div className="mx-auto max-w-[1760px] px-4 py-6 pb-28 sm:px-6 lg:px-8 lg:py-8 lg:pb-12">
                    <nav
                        aria-label="Breadcrumb"
                        className="mb-5 flex flex-wrap items-center gap-2 text-sm text-lumen-muted"
                    >
                        <Link
                            href={home()}
                            className="inline-flex items-center gap-2 rounded-full border border-lumen-line bg-white/[0.62] px-3 py-2 shadow-sm transition hover:bg-white hover:text-lumen-text dark:bg-white/[0.05] dark:shadow-none dark:hover:bg-white/[0.08] dark:hover:text-white"
                        >
                            <ArrowLeft className="size-4" />
                            Prompt Library
                        </Link>
                        <span>/</span>
                        <span className="line-clamp-1 text-lumen-soft">
                            {promptItem.title}
                        </span>
                    </nav>

                    <div className="grid gap-6 xl:grid-cols-[minmax(22rem,0.9fr)_minmax(0,1.1fr)]">
                        <section className="space-y-4">
                            <div className="relative overflow-hidden rounded-[1.75rem] border border-lumen-line bg-lumen-panel shadow-lumen-card">
                                {displayImageUrl ? (
                                    <img
                                        src={displayImageUrl}
                                        alt={promptItem.title}
                                        className="aspect-[4/5] w-full object-cover md:aspect-[16/13] xl:aspect-[4/5]"
                                    />
                                ) : (
                                    <PromptImagePlaceholder className="aspect-[4/5] w-full md:aspect-[16/13] xl:aspect-[4/5]" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/[0.82] via-transparent to-transparent opacity-80" />
                                <div className="absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-2 p-4">
                                    {promptItem.category && (
                                        <Badge
                                            variant="outline"
                                            className={`rounded-full backdrop-blur-xl ${categoryBadgeClasses[promptItem.category]}`}
                                        >
                                            {
                                                categoryLabels[
                                                    promptItem.category
                                                ]
                                            }
                                        </Badge>
                                    )}
                                    <Badge className="ml-auto rounded-full border-white/15 bg-black/[0.58] text-white/85 backdrop-blur-xl">
                                        <Eye className="size-3.5" />
                                        {promptItem.generation_mode === 'auto'
                                            ? 'Generated thumbnail'
                                            : promptItem.generation_mode ===
                                                'imported'
                                              ? 'Imported image'
                                              : 'Reference image'}
                                    </Badge>
                                </div>
                                <div className="absolute inset-x-0 bottom-0 p-5">
                                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-lumen-soft uppercase">
                                        <span>
                                            {formatGeneratedDate(
                                                promptItem.generated_at,
                                            )}
                                        </span>
                                        {promptItem.model_label && (
                                            <>
                                                <span className="text-lumen-muted">
                                                    /
                                                </span>
                                                <span className="font-mono text-lumen-accent">
                                                    {promptItem.model_label}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {promptItem.style_notes && (
                                <StyleNotesPanel
                                    notes={promptItem.style_notes}
                                />
                            )}
                        </section>

                        <section className="space-y-4 xl:sticky xl:top-28 xl:self-start">
                            <div className="overflow-hidden rounded-[1.75rem] border border-lumen-line bg-white/[0.66] text-lumen-text shadow-lumen-card backdrop-blur-xl dark:bg-lumen-panel/[0.88]">
                                <div className="lumen-scanline h-px w-full" />
                                <div className="space-y-6 p-5 sm:p-6 lg:p-7">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge className="rounded-full border-lumen-primary/[0.35] bg-lumen-primary/[0.14] text-lumen-primary-bright">
                                            <Sparkles />
                                            Prompt sheet
                                        </Badge>
                                        <Badge
                                            variant="outline"
                                            className="rounded-full border-lumen-line bg-white/[0.62] text-lumen-soft shadow-sm dark:bg-white/[0.05] dark:shadow-none"
                                        >
                                            <Copy className="size-3.5" />
                                            {formatCount(copyCount)} copied
                                        </Badge>
                                        {promptItem.source_label && (
                                            <Badge
                                                variant="outline"
                                                className="rounded-full border-lumen-line bg-white/[0.62] text-lumen-soft shadow-sm dark:bg-white/[0.05] dark:shadow-none"
                                            >
                                                {promptItem.source_label}
                                            </Badge>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        <h1 className="text-4xl leading-none font-semibold text-balance text-lumen-text sm:text-5xl">
                                            {promptItem.title}
                                        </h1>
                                        <p className="max-w-3xl border-l-2 border-lumen-accent/[0.65] pl-4 text-sm leading-7 text-lumen-soft sm:text-base">
                                            {promptItem.prompt_preview}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-[minmax(0,1fr)_3rem] gap-2 sm:flex sm:flex-wrap">
                                        <Button
                                            type="button"
                                            className="h-12 rounded-full bg-gradient-to-r from-lumen-primary to-lumen-accent px-5 text-white shadow-[0_12px_32px_rgb(124_58_237_/_0.22)] hover:brightness-105"
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
                                                    className="h-12 w-12 rounded-full border-lumen-line bg-white/[0.68] text-lumen-text shadow-sm hover:bg-white hover:text-lumen-text dark:bg-white/[0.06] dark:shadow-none dark:hover:bg-white/[0.12] dark:hover:text-white"
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

                            <PromptTextPanel
                                title="Prompt"
                                value={promptText}
                                copied={copiedValue === promptText}
                                onCopy={() => void copyPrompt()}
                            />

                            {promptItem.negative_prompt && (
                                <PromptTextPanel
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

                    {relatedPrompts.length > 0 && (
                        <section className="mt-12">
                            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                                <div>
                                    <p className="mb-2 text-xs font-semibold text-lumen-accent uppercase">
                                        Related prompts
                                    </p>
                                    <h2 className="text-3xl font-semibold text-lumen-text">
                                        Continue this visual direction
                                    </h2>
                                </div>
                                <Button
                                    asChild
                                    variant="outline"
                                    className="w-fit rounded-full border-lumen-line bg-white/[0.68] text-lumen-text shadow-sm hover:bg-white hover:text-lumen-text dark:bg-white/[0.06] dark:shadow-none dark:hover:bg-white/[0.12] dark:hover:text-white"
                                >
                                    <Link href={PromptController.index()}>
                                        View all prompts
                                    </Link>
                                </Button>
                            </div>
                            <div className="grid grid-cols-1 gap-4 min-[560px]:grid-cols-2 lg:grid-cols-4">
                                {relatedPrompts.map((prompt) => (
                                    <PromptCard
                                        key={prompt.id}
                                        prompt={prompt}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-lumen-line bg-white/[0.84] p-3 shadow-[0_-18px_52px_rgb(15_23_42_/_0.10)] backdrop-blur-xl md:hidden dark:bg-lumen-obsidian/[0.88] dark:shadow-none">
                        <Button
                            type="button"
                            className="h-12 w-full rounded-full bg-gradient-to-r from-lumen-primary to-lumen-accent text-white hover:brightness-105"
                            onClick={() => void copyPrompt()}
                            disabled={promptText === ''}
                        >
                            {copiedValue === promptText ? <Check /> : <Copy />}
                            {copiedValue === promptText
                                ? 'Copied'
                                : 'Copy Prompt'}
                        </Button>
                    </div>
                </div>
            </PublicPromptShell>
        </>
    );
}
