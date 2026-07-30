import { Check, Copy, TerminalSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PromptStyleNotes } from '@/types';

export function PromptTextPanel({
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
        <section className="overflow-hidden rounded-[1.35rem] border border-lumen-line bg-lumen-surface text-lumen-text shadow-lumen-card backdrop-blur-xl dark:bg-lumen-surface/[0.82]">
            <div className="flex items-center justify-between gap-3 border-b border-lumen-line bg-white/[0.42] px-4 py-3 sm:px-5 dark:bg-white/[0.03]">
                <div className="flex min-w-0 items-center gap-2">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full border border-lumen-accent/[0.25] bg-lumen-accent/[0.10] text-lumen-accent">
                        <TerminalSquare className="size-4" />
                    </span>
                    <h2 className="truncate text-sm font-semibold text-lumen-soft uppercase">
                        {title}
                    </h2>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-full border-lumen-line bg-white/[0.70] text-lumen-text shadow-sm hover:bg-white hover:text-lumen-text dark:bg-white/[0.06] dark:shadow-none dark:hover:bg-white/[0.12] dark:hover:text-white"
                    onClick={onCopy}
                    disabled={value === ''}
                >
                    {copied ? <Check /> : <Copy />}
                    {copied ? 'Copied' : 'Copy'}
                </Button>
            </div>
            <div className="p-4 sm:p-5">
                <p className="font-mono text-[13px] leading-7 break-words whitespace-pre-wrap text-lumen-soft sm:text-sm">
                    {value}
                </p>
            </div>
        </section>
    );
}

export function StyleNotesPanel({ notes }: { notes: PromptStyleNotes }) {
    return (
        <section className="overflow-hidden rounded-[1.35rem] border border-lumen-line bg-lumen-surface text-lumen-text shadow-lumen-card backdrop-blur-xl dark:bg-lumen-surface/[0.82]">
            <div className="flex items-center justify-between gap-3 border-b border-lumen-line bg-white/[0.42] px-4 py-3 sm:px-5 dark:bg-white/[0.03]">
                <h2 className="text-sm font-semibold text-lumen-soft uppercase">
                    Style notes
                </h2>
                <span className="rounded-full border border-lumen-primary/[0.24] bg-lumen-primary/[0.12] px-2.5 py-1 font-mono text-[11px] text-lumen-primary-bright">
                    visual recipe
                </span>
            </div>
            <dl className="grid gap-px bg-lumen-line sm:grid-cols-2">
                {Object.entries(notes).map(([key, value]) => (
                    <div
                        key={key}
                        className="min-w-0 bg-white/[0.62] p-4 dark:bg-lumen-surface/[0.96]"
                    >
                        <dt className="mb-1 text-xs font-semibold text-lumen-muted uppercase">
                            {key.replace('_', ' ')}
                        </dt>
                        <dd className="text-sm leading-6 break-words text-lumen-soft">
                            {value}
                        </dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}
