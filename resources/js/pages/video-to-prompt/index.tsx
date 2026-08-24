import { Head, Link, useForm } from '@inertiajs/react';
import { Film, UploadCloud } from 'lucide-react';
import VideoAnalysisController from '@/actions/App/Http/Controllers/VideoAnalysisController';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';

type Analysis = {
    id: number;
    original_filename: string;
    status: string;
    progress: number;
    created_at: string;
};

export default function VideoToPrompt({ analyses }: { analyses: Analysis[] }) {
    const form = useForm<{ video: File | null; customization: string }>({
        video: null,
        customization: '',
    });

    return (
        <AppLayout
            breadcrumbs={[
                {
                    title: 'Video to Prompt',
                    href: VideoAnalysisController.index().url,
                },
            ]}
        >
            <Head title="Video to Prompt" />
            <div className="mx-auto grid w-full max-w-6xl gap-6 p-4 md:p-8">
                <header className="flex items-center gap-4">
                    <span className="rounded-2xl bg-violet-600 p-3 text-white">
                        <Film />
                    </span>
                    <div>
                        <h1 className="text-3xl font-semibold">
                            Video to Prompt
                        </h1>
                        <p className="text-muted-foreground">
                            Reverse-engineer cinematic direction from a
                            reference video.
                        </p>
                    </div>
                </header>
                <Card>
                    <CardHeader>
                        <CardTitle>Upload a reference video</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form
                            className="grid gap-4"
                            onSubmit={(event) => {
                                event.preventDefault();
                                form.post(VideoAnalysisController.store().url, {
                                    forceFormData: true,
                                });
                            }}
                        >
                            <label className="grid min-h-48 cursor-pointer place-items-center rounded-xl border border-dashed bg-muted/30 p-6 text-center">
                                <UploadCloud className="size-9" />
                                <span>
                                    Choose MP4, MOV, WebM or M4V (max 100 MB)
                                </span>
                                <input
                                    className="sr-only"
                                    type="file"
                                    accept="video/mp4,video/quicktime,video/webm,video/x-m4v"
                                    onChange={(event) =>
                                        form.setData(
                                            'video',
                                            event.target.files?.[0] ?? null,
                                        )
                                    }
                                />
                            </label>
                            {form.data.video && (
                                <p className="text-sm">
                                    {form.data.video.name} ·{' '}
                                    {(form.data.video.size / 1048576).toFixed(
                                        1,
                                    )}{' '}
                                    MB
                                </p>
                            )}
                            <InputError message={form.errors.video} />
                            <textarea
                                className="min-h-24 rounded-md border bg-background p-3 text-sm"
                                placeholder="Optional: describe what should change in the recreated video"
                                value={form.data.customization}
                                onChange={(event) =>
                                    form.setData(
                                        'customization',
                                        event.target.value,
                                    )
                                }
                            />
                            {form.progress && (
                                <progress
                                    className="w-full"
                                    max="100"
                                    value={form.progress.percentage}
                                />
                            )}
                            <Button
                                disabled={!form.data.video || form.processing}
                            >
                                {form.processing
                                    ? 'Uploading…'
                                    : 'Analyze video'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
                <section className="grid gap-3">
                    <h2 className="text-xl font-semibold">Recent analyses</h2>
                    {analyses.length === 0 ? (
                        <p className="rounded-xl border p-6 text-muted-foreground">
                            Your analyses will appear here.
                        </p>
                    ) : (
                        analyses.map((analysis) => (
                            <Link
                                key={analysis.id}
                                href={VideoAnalysisController.show(analysis.id)}
                                className="flex items-center justify-between rounded-xl border bg-card p-4 hover:border-violet-400"
                            >
                                <span className="truncate font-medium">
                                    {analysis.original_filename}
                                </span>
                                <Badge variant="outline">
                                    {analysis.status} · {analysis.progress}%
                                </Badge>
                            </Link>
                        ))
                    )}
                </section>
            </div>
        </AppLayout>
    );
}
