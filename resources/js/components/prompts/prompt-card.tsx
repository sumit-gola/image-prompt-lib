import { Link } from '@inertiajs/react';
import { Check, Copy, Crown, Eye, Share2 } from 'lucide-react';
import PromptController from '@/actions/App/Http/Controllers/PromptController';
import {
    categoryBadgeClasses,
    categoryLabels,
    formatCount,
    formatGeneratedDate,
} from '@/components/prompts/prompt-library-config';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { usePromptActions } from '@/hooks/use-prompt-actions';
import type { PromptLibraryItem } from '@/types';

type Props = {
    prompt: PromptLibraryItem;
    featured?: boolean;
};

export function PromptCard({ featured = false, prompt }: Props) {
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
        <article
            className={`group relative isolate min-w-0 overflow-hidden rounded-[1.35rem] border border-lumen-line bg-lumen-surface/[0.78] text-lumen-text shadow-lumen-card ring-1 ring-white/[0.03] backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-lumen-line-strong hover:bg-lumen-hover/[0.88] hover:shadow-lumen-glow ${featured ? 'lg:row-span-2' : ''}`}
        >
            <Link
                href={PromptController.show(prompt.id)}
                className="absolute inset-0 z-0 rounded-[1.35rem] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lumen-accent"
                aria-label={`Open ${prompt.title}`}
                prefetch
            />

            <div className="pointer-events-none relative z-10">
                <div className="relative overflow-hidden bg-lumen-panel">
                    <img
                        src={prompt.thumbnail_url}
                        alt={prompt.title}
                        className={`w-full object-cover transition duration-500 group-hover:scale-[1.035] ${featured ? 'aspect-[4/5] lg:aspect-[3/4]' : 'aspect-[4/5]'}`}
                        loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-lumen-obsidian via-lumen-obsidian/[0.18] to-transparent opacity-[0.86]" />
                    <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
                        {prompt.category && (
                            <Badge
                                variant="outline"
                                className={`rounded-full backdrop-blur-xl ${categoryBadgeClasses[prompt.category]}`}
                            >
                                {categoryLabels[prompt.category]}
                            </Badge>
                        )}
                        <span className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-full border border-white/12 bg-lumen-obsidian/[0.74] px-2.5 text-xs font-semibold text-lumen-soft backdrop-blur-xl">
                            <Copy className="size-3.5" />
                            {formatCount(copyCount)}
                        </span>
                    </div>

                    <div className="absolute inset-x-0 bottom-0 p-4">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                            {prompt.model_label && (
                                <span className="rounded-full border border-lumen-accent/[0.30] bg-lumen-accent/[0.12] px-2.5 py-1 font-mono text-[11px] font-semibold text-lumen-accent">
                                    {prompt.model_label}
                                </span>
                            )}
                            <span className="rounded-full border border-white/12 bg-white/[0.09] px-2.5 py-1 text-[11px] font-semibold uppercase text-lumen-soft">
                                {formatGeneratedDate(prompt.generated_at)}
                            </span>
                        </div>
                        <h2 className="line-clamp-2 text-xl font-semibold leading-tight text-balance text-white">
                            {prompt.title}
                        </h2>
                    </div>
                </div>

                <div className="grid min-h-[13.5rem] gap-4 p-4">
                    <div className="space-y-3">
                        <div className="flex min-w-0 items-center gap-2 text-xs font-semibold uppercase text-lumen-muted">
                            <span className="truncate">
                                {prompt.source_label ?? 'Curated library'}
                            </span>
                            <span className="h-px min-w-6 flex-1 bg-lumen-line" />
                            <span className="inline-flex items-center gap-1">
                                <Eye className="size-3.5" />
                                Ready
                            </span>
                        </div>
                        <p className="line-clamp-3 text-sm leading-6 text-lumen-soft">
                            {prompt.prompt_preview || promptText}
                        </p>
                    </div>

                    <div className="pointer-events-auto mt-auto grid grid-cols-[minmax(0,1fr)_2.75rem] gap-2">
                        <Button
                            type="button"
                            className="h-11 rounded-full bg-lumen-text text-lumen-obsidian shadow-[0_12px_30px_rgb(247_248_252_/_0.16)] hover:bg-white"
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
                                    className="h-11 w-11 rounded-full border-lumen-line bg-white/[0.06] text-lumen-text hover:bg-white/[0.12] hover:text-white"
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

            {featured && (
                <div className="pointer-events-none absolute top-14 right-3 z-20 inline-flex items-center gap-1 rounded-full border border-lumen-premium/[0.32] bg-lumen-premium/[0.14] px-2.5 py-1 text-[11px] font-semibold text-lumen-premium backdrop-blur-xl">
                    <Crown className="size-3.5" />
                    Featured
                </div>
            )}
        </article>
    );
}
