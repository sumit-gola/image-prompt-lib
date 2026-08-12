import { Head, useForm } from '@inertiajs/react';
import {
    Check,
    Copy,
    ImagePlus,
    LoaderCircle,
    Sparkles,
    UploadCloud,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import ImageToPromptController from '@/actions/App/Http/Controllers/ImageToPromptController';
import InputError from '@/components/input-error';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';

type AiConfiguration = {
    provider: string | null;
    model: string | null;
    is_configured: boolean;
    message: string | null;
    credential_env: string | null;
};

type GeneratedPrompt = {
    title: string;
    prompt: string;
    negative_prompt: string | null;
    category: string;
    style_notes: Record<string, string>;
};

type Props = {
    aiConfiguration: AiConfiguration;
    generatedPrompt: GeneratedPrompt | null;
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Image to Prompt',
        href: ImageToPromptController.index(),
    },
];

export default function ImageToPrompt({
    aiConfiguration,
    generatedPrompt,
}: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const { data, setData, post, processing, errors, clearErrors } = useForm<{
        image: File | null;
    }>({ image: null });

    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    function selectImage(file: File | null) {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }

        clearErrors('image');
        setData('image', file);
        setPreviewUrl(file ? URL.createObjectURL(file) : null);
    }

    function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        post(ImageToPromptController.store().url, {
            forceFormData: true,
            preserveScroll: true,
        });
    }

    async function copyText(field: string, text: string) {
        await navigator.clipboard.writeText(text);
        setCopiedField(field);
        window.setTimeout(() => setCopiedField(null), 1600);
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Image to Prompt" />

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto p-4 md:p-6">
                <header className="flex flex-col gap-2 border-b pb-5">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                            <Sparkles className="size-5" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-semibold tracking-tight">
                                Image to Prompt
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Upload a reference and let AI turn its visual
                                language into a reusable generation prompt.
                            </p>
                        </div>
                    </div>
                </header>

                {!aiConfiguration.is_configured && (
                    <Alert variant="destructive">
                        <X />
                        <AlertTitle>AI provider needs configuration</AlertTitle>
                        <AlertDescription>
                            {aiConfiguration.message ??
                                `Add ${aiConfiguration.credential_env ?? 'the provider API key'} to your environment.`}
                        </AlertDescription>
                    </Alert>
                )}

                <div className="grid flex-1 gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                    <Card className="h-fit overflow-hidden py-0">
                        <CardHeader className="border-b bg-muted/30 px-5 py-5">
                            <div className="flex items-start justify-between gap-3">
                                <div className="grid gap-1">
                                    <CardTitle>Reference image</CardTitle>
                                    <CardDescription>
                                        JPEG, PNG, or WebP up to 5 MB.
                                    </CardDescription>
                                </div>
                                <Badge variant="outline">
                                    {aiConfiguration.model ?? 'AI vision'}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-5">
                            <form onSubmit={submit} className="grid gap-4">
                                <input
                                    ref={inputRef}
                                    className="sr-only"
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={(event) =>
                                        selectImage(
                                            event.target.files?.[0] ?? null,
                                        )
                                    }
                                />

                                <div
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => inputRef.current?.click()}
                                    onKeyDown={(event) => {
                                        if (
                                            event.key === 'Enter' ||
                                            event.key === ' '
                                        ) {
                                            event.preventDefault();
                                            inputRef.current?.click();
                                        }
                                    }}
                                    onDragEnter={(event) => {
                                        event.preventDefault();
                                        setIsDragging(true);
                                    }}
                                    onDragOver={(event) =>
                                        event.preventDefault()
                                    }
                                    onDragLeave={() => setIsDragging(false)}
                                    onDrop={(event) => {
                                        event.preventDefault();
                                        setIsDragging(false);
                                        selectImage(
                                            event.dataTransfer.files[0] ?? null,
                                        );
                                    }}
                                    className={cn(
                                        'group relative flex min-h-80 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed bg-muted/20 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                        isDragging &&
                                            'border-primary bg-primary/5',
                                        errors.image && 'border-destructive',
                                    )}
                                >
                                    {previewUrl ? (
                                        <>
                                            <img
                                                src={previewUrl}
                                                alt="Selected reference preview"
                                                className="absolute inset-0 size-full object-contain"
                                            />
                                            <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-3 rounded-lg border bg-background/90 p-2 shadow-sm backdrop-blur">
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium">
                                                        {data.image?.name}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {data.image
                                                            ? `${(data.image.size / 1024 / 1024).toFixed(2)} MB`
                                                            : ''}
                                                    </p>
                                                </div>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        selectImage(null);
                                                        if (inputRef.current) {
                                                            inputRef.current.value =
                                                                '';
                                                        }
                                                    }}
                                                >
                                                    <X />
                                                    Remove
                                                </Button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="grid max-w-sm justify-items-center gap-3 p-8 text-center">
                                            <div className="flex size-14 items-center justify-center rounded-2xl border bg-background shadow-sm transition-transform group-hover:-translate-y-0.5">
                                                <UploadCloud className="size-6 text-muted-foreground" />
                                            </div>
                                            <div>
                                                <p className="font-medium">
                                                    Drop an image here
                                                </p>
                                                <p className="mt-1 text-sm text-muted-foreground">
                                                    or click to choose a file
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <InputError message={errors.image} />

                                <Button
                                    type="submit"
                                    size="lg"
                                    disabled={
                                        !data.image ||
                                        processing ||
                                        !aiConfiguration.is_configured
                                    }
                                    className="w-full"
                                >
                                    {processing ? (
                                        <LoaderCircle className="animate-spin" />
                                    ) : (
                                        <Sparkles />
                                    )}
                                    {processing
                                        ? 'Analyzing image…'
                                        : 'Generate prompt'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <PromptResult
                        result={generatedPrompt}
                        processing={processing}
                        copiedField={copiedField}
                        onCopy={copyText}
                    />
                </div>
            </div>
        </AppLayout>
    );
}

function PromptResult({
    result,
    processing,
    copiedField,
    onCopy,
}: {
    result: GeneratedPrompt | null;
    processing: boolean;
    copiedField: string | null;
    onCopy: (field: string, text: string) => Promise<void>;
}) {
    if (processing) {
        return (
            <Card className="min-h-[32rem] items-center justify-center">
                <div className="grid max-w-sm justify-items-center gap-4 p-8 text-center">
                    <LoaderCircle className="size-9 animate-spin text-primary" />
                    <div>
                        <h2 className="font-semibold">
                            Reading visual details
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            AI is analyzing composition, lighting, color, mood,
                            and camera treatment.
                        </p>
                    </div>
                </div>
            </Card>
        );
    }

    if (!result) {
        return (
            <Card className="min-h-[32rem] items-center justify-center border-dashed shadow-none">
                <div className="grid max-w-md justify-items-center gap-4 p-8 text-center">
                    <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
                        <ImagePlus className="size-7 text-muted-foreground" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold">
                            Your generated prompt appears here
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            Choose a clear reference image. The result will
                            capture its style without identifying real people.
                        </p>
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <Card className="overflow-hidden py-0">
            <CardHeader className="border-b bg-muted/30 px-5 py-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="grid gap-1">
                        <CardTitle>{result.title}</CardTitle>
                        <CardDescription>
                            Ready to paste into your preferred image model.
                        </CardDescription>
                    </div>
                    <Badge className="capitalize">{result.category}</Badge>
                </div>
            </CardHeader>
            <CardContent className="grid gap-5 p-5">
                <ResultSection
                    title="Generation prompt"
                    text={result.prompt}
                    copied={copiedField === 'prompt'}
                    onCopy={() => onCopy('prompt', result.prompt)}
                />

                {result.negative_prompt && (
                    <ResultSection
                        title="Negative prompt"
                        text={result.negative_prompt}
                        copied={copiedField === 'negative'}
                        onCopy={() =>
                            onCopy('negative', result.negative_prompt ?? '')
                        }
                    />
                )}

                {Object.keys(result.style_notes).length > 0 && (
                    <section className="grid gap-3">
                        <h3 className="text-sm font-medium">
                            Visual breakdown
                        </h3>
                        <dl className="grid gap-2 sm:grid-cols-2">
                            {Object.entries(result.style_notes).map(
                                ([label, value]) => (
                                    <div
                                        key={label}
                                        className="rounded-lg border bg-muted/20 p-3"
                                    >
                                        <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                            {label.replaceAll('_', ' ')}
                                        </dt>
                                        <dd className="mt-1 text-sm leading-5">
                                            {value}
                                        </dd>
                                    </div>
                                ),
                            )}
                        </dl>
                    </section>
                )}
            </CardContent>
        </Card>
    );
}

function ResultSection({
    title,
    text,
    copied,
    onCopy,
}: {
    title: string;
    text: string;
    copied: boolean;
    onCopy: () => void;
}) {
    return (
        <section className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-medium">{title}</h3>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onCopy}
                >
                    {copied ? <Check /> : <Copy />}
                    {copied ? 'Copied' : 'Copy'}
                </Button>
            </div>
            <div className="rounded-xl border bg-muted/30 p-4 text-sm leading-7 whitespace-pre-wrap">
                {text}
            </div>
        </section>
    );
}
