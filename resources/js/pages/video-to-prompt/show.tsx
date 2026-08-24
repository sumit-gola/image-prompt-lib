import { Head, router, useForm } from '@inertiajs/react';
import { Check, Copy, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import VideoAnalysisController from '@/actions/App/Http/Controllers/VideoAnalysisController';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';

type Analysis = {
    id: number;
    original_filename: string;
    status: string;
    progress: number;
    status_message: string | null;
    customization: string | null;
    analysis: {
        summary?: string;
        scenes?: Record<string, string>[];
        confidence_notes?: string;
    } | null;
    master_prompt: string | null;
    shot_by_shot_prompt: string | null;
    technical_prompt: string | null;
    negative_prompt: string | null;
    condensed_prompt: string | null;
    error_message: string | null;
};

export default function ShowVideoAnalysis({
    analysis,
}: {
    analysis: Analysis;
}) {
    const [copied, setCopied] = useState<string | null>(null);
    const form = useForm({ customization: analysis.customization ?? '' });
    useEffect(() => {
        if (analysis.status === 'queued' || analysis.status === 'processing') {
            const timer = window.setInterval(
                () => router.reload({ only: ['analysis'] }),
                3000,
            );

            return () => window.clearInterval(timer);
        }
    }, [analysis.status]);
    const prompts: Array<[string, string | null]> = [
        ['Master prompt', analysis.master_prompt],
        ['Shot-by-shot', analysis.shot_by_shot_prompt],
        ['Technical settings', analysis.technical_prompt],
        ['Negative prompt', analysis.negative_prompt],
        ['Condensed prompt', analysis.condensed_prompt],
    ];
    async function copy(label: string, value: string) {
        await navigator.clipboard.writeText(value);
        setCopied(label);
        window.setTimeout(() => setCopied(null), 1500);
    }

    return (
        <AppLayout
            breadcrumbs={[
                {
                    title: 'Video to Prompt',
                    href: VideoAnalysisController.index().url,
                },
                {
                    title: analysis.original_filename,
                    href: VideoAnalysisController.show(analysis.id).url,
                },
            ]}
        >
            <Head title={analysis.original_filename} />
            <div className="mx-auto grid w-full max-w-6xl gap-6 p-4 md:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold">
                            {analysis.original_filename}
                        </h1>
                        <p className="text-muted-foreground">
                            {analysis.status_message}
                        </p>
                    </div>
                    <Button
                        variant="destructive"
                        onClick={() => {
                            if (
                                window.confirm(
                                    'Delete this analysis and its video?',
                                )
                            ) {
router.delete(
                                    VideoAnalysisController.destroy(analysis.id)
                                        .url,
                                );
}
                        }}
                    >
                        <Trash2 /> Delete
                    </Button>
                </div>
                {(analysis.status === 'queued' ||
                    analysis.status === 'processing') && (
                    <Card>
                        <CardContent className="grid gap-3 p-6">
                            <div className="h-2 overflow-hidden rounded-full bg-muted">
                                <div
                                    className="h-full bg-violet-600 transition-all"
                                    style={{ width: `${analysis.progress}%` }}
                                />
                            </div>
                            <p>{analysis.progress}% complete</p>
                        </CardContent>
                    </Card>
                )}
                {analysis.status === 'failed' && (
                    <Card className="border-destructive">
                        <CardContent className="grid gap-4 p-6">
                            <p className="text-destructive">
                                {analysis.error_message}
                            </p>
                            <Button
                                onClick={() =>
                                    form.post(
                                        VideoAnalysisController.regenerate(
                                            analysis.id,
                                        ).url,
                                    )
                                }
                            >
                                <RefreshCw /> Retry
                            </Button>
                        </CardContent>
                    </Card>
                )}
                {analysis.analysis?.summary && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Cinematic overview</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-3">
                            <p>{analysis.analysis.summary}</p>
                            <p className="text-sm text-muted-foreground">
                                {analysis.analysis.confidence_notes}
                            </p>
                        </CardContent>
                    </Card>
                )}
                {analysis.status === 'completed' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Customize and regenerate</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form
                                className="grid gap-3"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    form.post(
                                        VideoAnalysisController.regenerate(
                                            analysis.id,
                                        ).url,
                                    );
                                }}
                            >
                                <textarea
                                    className="min-h-24 rounded-md border bg-background p-3"
                                    value={form.data.customization}
                                    onChange={(event) =>
                                        form.setData(
                                            'customization',
                                            event.target.value,
                                        )
                                    }
                                />
                                <Button disabled={form.processing}>
                                    <RefreshCw /> Regenerate prompts
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                )}
                {prompts.map(
                    ([label, value]) =>
                        value && (
                            <Card key={label}>
                                <CardHeader className="flex-row items-center justify-between">
                                    <CardTitle>{label}</CardTitle>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            copy(label, value as string)
                                        }
                                    >
                                        {copied === label ? (
                                            <Check />
                                        ) : (
                                            <Copy />
                                        )}{' '}
                                        Copy
                                    </Button>
                                </CardHeader>
                                <CardContent>
                                    <pre className="font-sans text-sm leading-6 whitespace-pre-wrap">
                                        {value}
                                    </pre>
                                </CardContent>
                            </Card>
                        ),
                )}
            </div>
        </AppLayout>
    );
}
