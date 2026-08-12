import { Head, useForm } from '@inertiajs/react';
import {
    Check,
    CircleCheck,
    Copy,
    ImagePlus,
    LoaderCircle,
    ScanLine,
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
import { cn } from '@/lib/utils';

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
        <>
            <Head title="Image to Prompt" />

            <div className="relative flex h-full flex-1 flex-col overflow-hidden">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_15%_0%,rgb(124_58_237_/_0.10),transparent_42%),radial-gradient(circle_at_85%_10%,rgb(6_182_212_/_0.08),transparent_38%)] dark:bg-[radial-gradient(circle_at_15%_0%,rgb(139_92_246_/_0.14),transparent_42%),radial-gradient(circle_at_85%_10%,rgb(6_182_212_/_0.08),transparent_38%)]" />

                <div className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">
                    <header className="flex flex-col gap-5 border-b pb-6 lg:flex-row lg:items-end lg:justify-between">
                        <div className="flex items-start gap-4">
                            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow-lg shadow-violet-500/20">
                                <Sparkles className="size-5" />
                            </div>
                            <div className="grid gap-1.5">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                                        Image to Prompt
                                    </h1>
                                    <Badge
                                        variant="outline"
                                        className="bg-background/70 backdrop-blur"
                                    >
                                        AI vision
                                    </Badge>
                                </div>
                                <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                                    Turn any visual reference into detailed,
                                    production-ready prompt language in one
                                    pass.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 self-start rounded-full border bg-background/70 px-3 py-1.5 text-xs text-muted-foreground shadow-sm backdrop-blur lg:self-auto">
                            <span
                                className={cn(
                                    'size-2 rounded-full',
                                    aiConfiguration.is_configured
                                        ? 'bg-emerald-500'
                                        : 'bg-destructive',
                                )}
                            />
                            <span>
                                {aiConfiguration.is_configured
                                    ? `${aiConfiguration.model ?? 'Vision model'} ready`
                                    : 'Provider not configured'}
                            </span>
                        </div>
                    </header>

                    {!aiConfiguration.is_configured && (
                        <Alert variant="destructive">
                            <X />
                            <AlertTitle>
                                AI provider needs configuration
                            </AlertTitle>
                            <AlertDescription>
                                {aiConfiguration.message ??
                                    `Add ${aiConfiguration.credential_env ?? 'the provider API key'} to your environment.`}
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="grid items-start gap-6 xl:grid-cols-[minmax(22rem,0.82fr)_minmax(0,1.18fr)]">
                        <Card className="overflow-hidden border-border/70 bg-card/90 py-0 shadow-lg shadow-black/5 backdrop-blur dark:shadow-black/20">
                            <CardHeader className="border-b bg-muted/25 px-5 py-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="grid gap-1">
                                        <CardTitle className="text-base">
                                            1. Add a reference
                                        </CardTitle>
                                        <CardDescription>
                                            Choose the look you want to
                                            recreate.
                                        </CardDescription>
                                    </div>
                                    <Badge variant="secondary">Max 5 MB</Badge>
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
                                        onClick={() =>
                                            inputRef.current?.click()
                                        }
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
                                                event.dataTransfer.files[0] ??
                                                    null,
                                            );
                                        }}
                                        className={cn(
                                            'group relative flex min-h-72 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed bg-[linear-gradient(145deg,rgb(248_250_252_/_0.72),rgb(255_255_255_/_0.96))] transition-all outline-none hover:border-violet-400 hover:shadow-inner focus-visible:ring-2 focus-visible:ring-ring dark:bg-[linear-gradient(145deg,rgb(24_24_27_/_0.72),rgb(9_9_11_/_0.96))]',
                                            isDragging &&
                                                'border-primary bg-primary/5',
                                            errors.image &&
                                                'border-destructive',
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
                                                            if (
                                                                inputRef.current
                                                            ) {
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
                                                <div className="flex size-14 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-500/20 transition-transform group-hover:-translate-y-1">
                                                    <UploadCloud className="size-6" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">
                                                        Drop your reference here
                                                    </p>
                                                    <p className="mt-1 text-sm text-muted-foreground">
                                                        or browse from your
                                                        device
                                                    </p>
                                                </div>
                                                <div className="flex gap-1.5">
                                                    {['JPG', 'PNG', 'WEBP'].map(
                                                        (format) => (
                                                            <span
                                                                key={format}
                                                                className="rounded-md border bg-background px-2 py-1 text-[10px] font-semibold tracking-wider text-muted-foreground"
                                                            >
                                                                {format}
                                                            </span>
                                                        ),
                                                    )}
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
                                        className="h-11 w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md shadow-violet-500/15 hover:from-violet-700 hover:to-fuchsia-700"
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
            </div>
        </>
    );
}

ImageToPrompt.layout = {
    breadcrumbs: [
        {
            title: 'Image to Prompt',
            href: ImageToPromptController.index(),
        },
    ],
};

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
            <Card className="min-h-[28rem] items-center justify-center overflow-hidden border-border/70 bg-card/90 shadow-lg shadow-black/5 backdrop-blur dark:shadow-black/20">
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
            <Card className="relative min-h-[28rem] overflow-hidden border-border/70 bg-card/80 py-0 shadow-lg shadow-black/5 backdrop-blur dark:shadow-black/20">
                <div className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-violet-500/10 blur-3xl" />
                <div className="grid min-h-[28rem] grid-rows-[auto_1fr]">
                    <div className="flex items-center justify-between gap-3 border-b bg-muted/20 px-5 py-4">
                        <div>
                            <p className="text-sm font-semibold">
                                2. Generated prompt
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Your creative blueprint
                            </p>
                        </div>
                        <Badge variant="outline">Waiting for image</Badge>
                    </div>

                    <div className="grid content-center gap-7 p-6 md:p-8">
                        <div className="flex items-start gap-4">
                            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                                <ImagePlus className="size-6" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold">
                                    Ready when you are
                                </h2>
                                <p className="mt-1 max-w-lg text-sm leading-6 text-muted-foreground">
                                    Add a clear image on the left. AI will map
                                    its visual DNA into prompt language you can
                                    copy into any image generator.
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                            <ProcessStep
                                icon={ScanLine}
                                label="Analyze"
                                detail="Subject & framing"
                            />
                            <ProcessStep
                                icon={Sparkles}
                                label="Translate"
                                detail="Light, color & style"
                            />
                            <ProcessStep
                                icon={CircleCheck}
                                label="Create"
                                detail="Copy-ready prompt"
                            />
                        </div>
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <Card className="overflow-hidden border-border/70 bg-card/90 py-0 shadow-lg shadow-black/5 backdrop-blur dark:shadow-black/20">
            <CardHeader className="border-b bg-muted/25 px-5 py-4">
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

function ProcessStep({
    icon: Icon,
    label,
    detail,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    detail: string;
}) {
    return (
        <div className="rounded-xl border bg-background/70 p-3.5">
            <Icon className="size-4 text-violet-600 dark:text-violet-400" />
            <p className="mt-3 text-sm font-medium">{label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
        </div>
    );
}
