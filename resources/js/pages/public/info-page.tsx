import { Link } from '@inertiajs/react';
import { ArrowRight, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import PromptController from '@/actions/App/Http/Controllers/PromptController';
import { PromptSeoHead } from '@/components/prompts/prompt-seo-head';
import { PublicPromptShell } from '@/components/prompts/public-prompt-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { home } from '@/routes';
import type { PromptCategory, PromptSeoMeta } from '@/types';

type InfoSection = {
    title: string;
    body: string[];
};

type InfoPageData = {
    eyebrow: string;
    title: string;
    description: string;
    contact_email?: string | null;
    sections: InfoSection[];
};

type Props = {
    categories: PromptCategory[];
    categoryCounts: Record<PromptCategory, number>;
    totalCompleted: number;
    page: InfoPageData;
    seo: PromptSeoMeta;
};

export default function PublicInfoPage({
    categories,
    categoryCounts,
    totalCompleted,
    page,
    seo,
}: Props) {
    return (
        <>
            <PromptSeoHead seo={seo} />

            <PublicPromptShell
                categories={categories}
                categoryCounts={categoryCounts}
                totalCompleted={totalCompleted}
            >
                <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
                    <section className="overflow-hidden rounded-[1.75rem] border border-lumen-line bg-white/[0.66] shadow-lumen-card backdrop-blur-xl dark:bg-lumen-panel/[0.86]">
                        <div className="lumen-scanline h-px w-full" />
                        <div className="grid gap-8 p-5 sm:p-7 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:p-8">
                            <div className="min-w-0 space-y-6">
                                <Badge className="rounded-full border-lumen-primary/[0.35] bg-lumen-primary/[0.14] text-lumen-primary-bright">
                                    <ShieldCheck />
                                    {page.eyebrow}
                                </Badge>
                                <div className="space-y-4">
                                    <h1 className="text-4xl leading-tight font-semibold text-balance text-lumen-text sm:text-5xl">
                                        {page.title}
                                    </h1>
                                    <p className="max-w-2xl text-base leading-7 text-lumen-soft">
                                        {page.description}
                                    </p>
                                </div>

                                {page.contact_email && (
                                    <a
                                        href={`mailto:${page.contact_email}`}
                                        className="inline-flex min-w-0 items-center gap-3 rounded-2xl border border-lumen-line bg-white/[0.66] px-4 py-3 text-sm font-semibold text-lumen-text shadow-sm transition hover:border-lumen-line-strong hover:bg-white dark:bg-white/[0.06] dark:shadow-none dark:hover:bg-white/[0.10]"
                                    >
                                        <Mail className="size-4 shrink-0 text-lumen-accent" />
                                        <span className="truncate">
                                            {page.contact_email}
                                        </span>
                                    </a>
                                )}

                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        asChild
                                        className="rounded-full bg-gradient-to-r from-lumen-primary to-lumen-accent text-white shadow-[0_12px_32px_rgb(124_58_237_/_0.22)] hover:brightness-105"
                                    >
                                        <Link href={PromptController.index()}>
                                            Browse prompts
                                            <ArrowRight />
                                        </Link>
                                    </Button>
                                    <Button
                                        asChild
                                        variant="outline"
                                        className="rounded-full border-lumen-line bg-white/[0.68] text-lumen-text shadow-sm hover:bg-white hover:text-lumen-text dark:bg-white/[0.06] dark:shadow-none dark:hover:bg-white/[0.12] dark:hover:text-white"
                                    >
                                        <Link href={home()}>Home</Link>
                                    </Button>
                                </div>
                            </div>

                            <div className="grid gap-3">
                                {page.sections.map((section, index) => (
                                    <article
                                        key={section.title}
                                        className="rounded-[1.25rem] border border-lumen-line bg-white/[0.58] p-4 shadow-sm dark:bg-white/[0.045] dark:shadow-none"
                                    >
                                        <div className="mb-3 flex items-center gap-3">
                                            <span className="grid size-9 shrink-0 place-items-center rounded-2xl border border-lumen-line bg-lumen-surface text-lumen-accent shadow-lumen-glow">
                                                <Sparkles className="size-4" />
                                            </span>
                                            <div className="min-w-0">
                                                <p className="text-xs font-semibold text-lumen-muted uppercase">
                                                    {String(index + 1).padStart(
                                                        2,
                                                        '0',
                                                    )}
                                                </p>
                                                <h2 className="text-lg font-semibold text-lumen-text">
                                                    {section.title}
                                                </h2>
                                            </div>
                                        </div>
                                        <div className="space-y-3 text-sm leading-6 text-lumen-soft">
                                            {section.body.map((paragraph) => (
                                                <p key={paragraph}>
                                                    {paragraph}
                                                </p>
                                            ))}
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </div>
                    </section>
                </div>
            </PublicPromptShell>
        </>
    );
}
