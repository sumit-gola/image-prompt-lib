import { Form, Head, Link, router, useHttp, usePoll } from '@inertiajs/react';
import {
    ArrowLeft,
    Bot,
    CalendarClock,
    Copy,
    ExternalLink,
    GitBranch,
    ImageIcon,
    LoaderCircle,
    Plus,
    Rocket,
    RefreshCw,
    Save,
    Sparkles,
    Trash2,
    Upload,
} from 'lucide-react';
import type { ComponentProps } from 'react';
import { useEffect, useRef, useState } from 'react';
import PushPromptToLiveController from '@/actions/App/Http/Controllers/Admin/PushPromptToLiveController';
import PromptVariantController from '@/actions/App/Http/Controllers/Admin/PromptVariantController';
import AdminPromptController from '@/actions/App/Http/Controllers/AdminPromptController';
import PromptThumbnailController from '@/actions/App/Http/Controllers/Api/PromptThumbnailController';
import { PromptImagePlaceholder } from '@/components/prompts/prompt-image-placeholder';
import { categoryLabels } from '@/components/prompts/prompt-library-config';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useClipboard } from '@/hooks/use-clipboard';
import type {
    AdminPromptItem,
    PromptCategory,
    PromptStatus,
    PromptStyleNotes,
} from '@/types';

type Props = {
    promptItem: AdminPromptItem;
    basePrompt: AdminPromptItem | null;
    variants: AdminPromptItem[];
    statuses: PromptStatus[];
    categories: PromptCategory[];
    imageAiConfiguration: {
        provider: string | null;
        model: string | null;
        is_configured: boolean;
        message: string | null;
    };
};

const statusLabels: Record<PromptStatus, string> = {
    pending: 'Pending',
    processing: 'Processing',
    completed: 'Completed',
    failed: 'Failed',
};

const generationModeLabels: Record<AdminPromptItem['generation_mode'], string> =
    {
        reference_image: 'Reference image',
        auto: 'Auto generated',
        imported: 'Imported',
        variant: 'Prompt variant',
    };

const styleNoteFields: Array<keyof PromptStyleNotes> = [
    'subject',
    'composition',
    'camera_angle',
    'lighting',
    'background',
    'colors',
    'mood',
    'quality',
    'dynamic_subject_guidance',
];

export default function EditPrompt({
    promptItem,
    basePrompt,
    variants,
    statuses,
    categories,
    imageAiConfiguration,
}: Props) {
    usePoll(
        2000,
        { only: ['promptItem', 'variants'] },
        {
            autoStart:
                promptItem.status === 'processing' ||
                variants.some((variant) =>
                    ['pending', 'processing'].includes(variant.status),
                ),
        },
    );
    const [status, setStatus] = useState<PromptStatus>(promptItem.status);
    const [category, setCategory] = useState<PromptCategory | 'none'>(
        promptItem.category ?? 'none',
    );
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [variantsOpen, setVariantsOpen] = useState(false);
    const [variantRows, setVariantRows] = useState([
        {
            gender_presentation: 'woman',
            age_group: 'young adult',
            age_range: '25-34',
            custom_instruction: '',
        },
    ]);
    const [pushLiveOpen, setPushLiveOpen] = useState(false);
    const [thumbnailOpen, setThumbnailOpen] = useState(false);
    const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<
        string | null
    >(null);
    const thumbnailInputRef = useRef<HTMLInputElement>(null);
    const thumbnailUpload = useHttp<{ thumbnail: File | null }>({
        thumbnail: null,
    });
    const [copiedValue, copy] = useClipboard();
    const displayImageUrl =
        promptItem.thumbnail_url ?? promptItem.reference_image_url;
    const promptText = promptItem.prompt ?? '';

    useEffect(() => {
        return () => {
            if (thumbnailPreviewUrl) {
                URL.revokeObjectURL(thumbnailPreviewUrl);
            }
        };
    }, [thumbnailPreviewUrl]);

    const selectThumbnail = (file: File | null) => {
        if (thumbnailPreviewUrl) {
            URL.revokeObjectURL(thumbnailPreviewUrl);
        }

        thumbnailUpload.clearErrors('thumbnail');
        thumbnailUpload.setData('thumbnail', file);
        setThumbnailPreviewUrl(file ? URL.createObjectURL(file) : null);
    };

    const resetThumbnailDialog = () => {
        selectThumbnail(null);
        thumbnailUpload.resetAndClearErrors();
        setThumbnailOpen(false);
    };

    const closeThumbnailDialog = () => {
        if (!thumbnailUpload.processing) {
            resetThumbnailDialog();
        }
    };

    const updateThumbnail = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!thumbnailUpload.data.thumbnail) {
            thumbnailUpload.setError('thumbnail', 'Choose an image to upload.');

            return;
        }

        await thumbnailUpload.post(
            PromptThumbnailController.url(promptItem.id),
            {
                onSuccess: () => {
                    resetThumbnailDialog();
                    router.reload({ only: ['promptItem'] });
                },
            },
        );
    };

    const deletePrompt = () => {
        router.delete(AdminPromptController.destroy(promptItem.id), {
            onSuccess: () => router.visit(AdminPromptController.index()),
        });
    };

    return (
        <>
            <Head title={`Edit ${promptItem.title}`} />

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-hidden p-4 sm:p-6">
                <header className="rounded-xl border bg-[linear-gradient(135deg,rgb(255_255_255_/_0.92),rgb(245_243_255_/_0.78),rgb(236_254_255_/_0.56))] p-4 shadow-sm backdrop-blur sm:p-5 dark:bg-[linear-gradient(135deg,rgb(17_24_39_/_0.88),rgb(49_46_129_/_0.28),rgb(8_47_73_/_0.24))]">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0 space-y-3">
                            <Button asChild variant="outline" size="sm">
                                <Link href={AdminPromptController.index()}>
                                    <ArrowLeft />
                                    Back to management
                                </Link>
                            </Button>
                            <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <StatusBadge status={promptItem.status} />
                                    <ModeBadge
                                        mode={promptItem.generation_mode}
                                    />
                                    <Badge variant="outline">
                                        {promptItem.base_prompt_id
                                            ? 'Variant'
                                            : 'Generic / Parent'}
                                    </Badge>
                                    {promptItem.category && (
                                        <Badge variant="outline">
                                            {
                                                categoryLabels[
                                                    promptItem.category
                                                ]
                                            }
                                        </Badge>
                                    )}
                                </div>
                                <h1 className="max-w-4xl text-2xl leading-tight font-semibold tracking-normal text-balance sm:text-3xl">
                                    {promptItem.title}
                                </h1>
                                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                                    Edit prompt copy, category, status, images,
                                    and visual style metadata before publishing
                                    it to the public library.
                                </p>
                                {basePrompt && (
                                    <Link
                                        href={basePrompt.edit_url}
                                        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                                    >
                                        <GitBranch className="size-4" /> Variant
                                        of {basePrompt.title}
                                    </Link>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4 lg:min-w-[28rem]">
                            <Metric
                                label="Copies"
                                value={promptItem.copy_count}
                            />
                            <Metric
                                label="Created"
                                value={formatDate(promptItem.created_at)}
                            />
                            <Metric
                                label="Generated"
                                value={formatDate(promptItem.generated_at)}
                            />
                            <Metric
                                label="Owner"
                                value={promptItem.user?.name ?? 'System'}
                            />
                        </div>
                    </div>
                </header>

                <div className="grid gap-6 xl:grid-cols-[minmax(22rem,0.42fr)_minmax(0,0.58fr)]">
                    <aside className="space-y-4">
                        <Card className="overflow-hidden rounded-xl py-0">
                            <div className="relative">
                                <div className="absolute top-3 right-3 z-10 flex flex-wrap justify-end gap-2">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        className="border-white/20 bg-white/90 text-black shadow-lg backdrop-blur hover:bg-white"
                                        onClick={() => setThumbnailOpen(true)}
                                    >
                                        <Upload />
                                        Upload thumbnail
                                    </Button>
                                    {!imageAiConfiguration.is_configured ||
                                    promptItem.status === 'processing' ||
                                    !promptItem.prompt ? (
                                        <Button
                                            type="button"
                                            className="border-white/20 bg-black/70 text-white shadow-lg backdrop-blur hover:bg-black/80"
                                            disabled
                                            title={
                                                imageAiConfiguration.message ??
                                                'A saved prompt is required.'
                                            }
                                        >
                                            {promptItem.status ===
                                            'processing' ? (
                                                <LoaderCircle className="animate-spin" />
                                            ) : (
                                                <Sparkles />
                                            )}
                                            {promptItem.status === 'processing'
                                                ? 'Generating…'
                                                : 'Generate image'}
                                        </Button>
                                    ) : (
                                        <Button
                                            asChild
                                            className="border-white/20 bg-black/70 text-white shadow-lg backdrop-blur hover:bg-black/80"
                                        >
                                            <Link
                                                href={AdminPromptController.generateThumbnail(
                                                    promptItem.id,
                                                )}
                                                method="post"
                                                preserveScroll
                                                title="Generate a new thumbnail from the saved prompt"
                                            >
                                                <Sparkles />
                                                {promptItem.thumbnail_url
                                                    ? 'Regenerate image'
                                                    : 'Generate image'}
                                            </Link>
                                        </Button>
                                    )}
                                </div>
                                {displayImageUrl ? (
                                    <img
                                        src={displayImageUrl}
                                        alt={promptItem.title}
                                        className="aspect-[4/5] w-full object-cover"
                                    />
                                ) : (
                                    <PromptImagePlaceholder className="aspect-[4/5] w-full" />
                                )}
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-white">
                                    <p className="line-clamp-2 text-sm font-medium">
                                        {promptItem.prompt_preview ||
                                            'Prompt preview is empty.'}
                                    </p>
                                </div>
                            </div>
                        </Card>

                        <Card className="rounded-xl">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Sparkles className="size-4" />
                                    Source context
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <InfoRow
                                    label="Source"
                                    value={providerLabel(promptItem)}
                                />
                                <InfoRow
                                    label="Mode"
                                    value={
                                        generationModeLabels[
                                            promptItem.generation_mode
                                        ]
                                    }
                                />
                                <InfoRow
                                    label="AI provider"
                                    value={
                                        promptItem.ai_provider ??
                                        promptItem.source_site ??
                                        'Not set'
                                    }
                                />
                                <InfoRow
                                    label="AI model"
                                    value={promptItem.ai_model ?? 'Not set'}
                                />
                                {promptItem.source_url && (
                                    <Button
                                        asChild
                                        variant="outline"
                                        size="sm"
                                        className="w-full justify-start"
                                    >
                                        <a
                                            href={promptItem.source_url}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            <ExternalLink />
                                            Open source
                                        </a>
                                    </Button>
                                )}
                            </CardContent>
                        </Card>

                        {promptText !== '' && (
                            <Card className="rounded-xl">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <Copy className="size-4" />
                                        Quick copy
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => void copy(promptText)}
                                    >
                                        <Copy />
                                        {copiedValue === promptText
                                            ? 'Copied'
                                            : 'Copy current prompt'}
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </aside>

                    <Form
                        {...AdminPromptController.update.form(promptItem.id)}
                        className="space-y-6"
                    >
                        {({ errors, processing, progress }) => (
                            <>
                                <input
                                    type="hidden"
                                    name="status"
                                    value={status}
                                />
                                <input
                                    type="hidden"
                                    name="category"
                                    value={category === 'none' ? '' : category}
                                />

                                <Card className="rounded-xl">
                                    <CardHeader className="gap-2">
                                        <CardTitle>Prompt details</CardTitle>
                                        <p className="text-sm text-muted-foreground">
                                            Completed prompts must include
                                            usable prompt text. Drafts can
                                            remain pending or failed while you
                                            repair them.
                                        </p>
                                    </CardHeader>
                                    <CardContent className="grid gap-5">
                                        <FieldError
                                            message={fieldError(
                                                errors,
                                                'prompt',
                                            )}
                                        />
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <TextField
                                                error={fieldError(
                                                    errors,
                                                    'title',
                                                )}
                                                id="title"
                                                label="Title"
                                                name="title"
                                                defaultValue={promptItem.title}
                                                required
                                            />
                                            <div className="grid gap-2">
                                                <Label>Status</Label>
                                                <Select
                                                    value={status}
                                                    onValueChange={(value) =>
                                                        setStatus(
                                                            value as PromptStatus,
                                                        )
                                                    }
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {statuses.map(
                                                            (option) => (
                                                                <SelectItem
                                                                    key={option}
                                                                    value={
                                                                        option
                                                                    }
                                                                >
                                                                    {
                                                                        statusLabels[
                                                                            option
                                                                        ]
                                                                    }
                                                                </SelectItem>
                                                            ),
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                                <FieldError
                                                    message={fieldError(
                                                        errors,
                                                        'status',
                                                    )}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div className="grid gap-2">
                                                <Label>Category</Label>
                                                <Select
                                                    value={category}
                                                    onValueChange={(value) =>
                                                        setCategory(
                                                            value as
                                                                | PromptCategory
                                                                | 'none',
                                                        )
                                                    }
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="No category" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">
                                                            No category
                                                        </SelectItem>
                                                        {categories.map(
                                                            (option) => (
                                                                <SelectItem
                                                                    key={option}
                                                                    value={
                                                                        option
                                                                    }
                                                                >
                                                                    {
                                                                        categoryLabels[
                                                                            option
                                                                        ]
                                                                    }
                                                                </SelectItem>
                                                            ),
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                                <FieldError
                                                    message={fieldError(
                                                        errors,
                                                        'category',
                                                    )}
                                                />
                                            </div>
                                            <TextField
                                                error={fieldError(
                                                    errors,
                                                    'generated_at',
                                                )}
                                                icon={CalendarClock}
                                                id="generated_at"
                                                label="Generated at"
                                                name="generated_at"
                                                type="datetime-local"
                                                defaultValue={dateTimeLocal(
                                                    promptItem.generated_at,
                                                )}
                                            />
                                        </div>

                                        <TextArea
                                            error={fieldError(errors, 'prompt')}
                                            id="prompt"
                                            label="Prompt"
                                            name="prompt"
                                            rows={12}
                                            defaultValue={
                                                promptItem.prompt ?? ''
                                            }
                                        />
                                        <TextArea
                                            error={fieldError(
                                                errors,
                                                'negative_prompt',
                                            )}
                                            id="negative_prompt"
                                            label="Negative prompt"
                                            name="negative_prompt"
                                            rows={5}
                                            defaultValue={
                                                promptItem.negative_prompt ?? ''
                                            }
                                        />
                                        <TextArea
                                            error={fieldError(
                                                errors,
                                                'thumbnail_prompt',
                                            )}
                                            id="thumbnail_prompt"
                                            label="Thumbnail prompt"
                                            name="thumbnail_prompt"
                                            rows={5}
                                            defaultValue={
                                                promptItem.thumbnail_prompt ??
                                                ''
                                            }
                                        />
                                    </CardContent>
                                </Card>

                                <Card className="rounded-xl">
                                    <CardHeader>
                                        <CardTitle>Image assets</CardTitle>
                                        <p className="text-sm text-muted-foreground">
                                            Replace the visible thumbnail or the
                                            stored reference image. New
                                            filenames are generated server-side.
                                        </p>
                                    </CardHeader>
                                    <CardContent className="grid gap-4 md:grid-cols-2">
                                        <FileField
                                            error={fieldError(
                                                errors,
                                                'thumbnail',
                                            )}
                                            id="thumbnail"
                                            label="Thumbnail image"
                                            name="thumbnail"
                                        />
                                        <FileField
                                            error={fieldError(
                                                errors,
                                                'reference_image',
                                            )}
                                            id="reference_image"
                                            label="Reference image"
                                            name="reference_image"
                                        />
                                        {progress && (
                                            <div className="h-2 overflow-hidden rounded-full bg-muted md:col-span-2">
                                                <div
                                                    className="h-full bg-primary transition-all"
                                                    style={{
                                                        width: `${progress.percentage}%`,
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                <Card className="rounded-xl">
                                    <CardHeader>
                                        <CardTitle>Style notes</CardTitle>
                                        <p className="text-sm text-muted-foreground">
                                            Keep these notes short and
                                            scannable. They support public
                                            detail pages and admin review.
                                        </p>
                                    </CardHeader>
                                    <CardContent className="grid gap-4 md:grid-cols-2">
                                        {styleNoteFields.map((field) => (
                                            <TextArea
                                                key={field}
                                                error={fieldError(
                                                    errors,
                                                    `style_notes.${field}`,
                                                )}
                                                id={`style_notes_${field}`}
                                                label={humanize(field)}
                                                name={`style_notes[${field}]`}
                                                rows={
                                                    field ===
                                                    'dynamic_subject_guidance'
                                                        ? 5
                                                        : 3
                                                }
                                                defaultValue={
                                                    promptItem.style_notes?.[
                                                        field
                                                    ] ?? ''
                                                }
                                                className={
                                                    field ===
                                                    'dynamic_subject_guidance'
                                                        ? 'md:col-span-2'
                                                        : undefined
                                                }
                                            />
                                        ))}
                                    </CardContent>
                                </Card>

                                <div className="sticky bottom-3 z-10 flex flex-col gap-2 rounded-xl border bg-background/92 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
                                    <div className="text-sm text-muted-foreground">
                                        Saving updates the admin record
                                        immediately. Public pages still only
                                        show completed prompts.
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() =>
                                                setPushLiveOpen(true)
                                            }
                                        >
                                            <Rocket />
                                            Push to live
                                        </Button>
                                        {promptItem.can_regenerate && (
                                            <Button asChild variant="outline">
                                                <Link
                                                    href={AdminPromptController.regenerate(
                                                        promptItem.id,
                                                    )}
                                                    method="post"
                                                    preserveScroll
                                                >
                                                    <RefreshCw />
                                                    Regenerate
                                                </Link>
                                            </Button>
                                        )}
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setDeleteOpen(true)}
                                        >
                                            <Trash2 />
                                            Delete
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={processing}
                                        >
                                            {processing ? (
                                                <LoaderCircle className="animate-spin" />
                                            ) : (
                                                <Save />
                                            )}
                                            Save prompt
                                        </Button>
                                    </div>
                                </div>
                            </>
                        )}
                    </Form>
                </div>

                <Card className="rounded-xl">
                    <CardHeader className="flex-row items-start justify-between gap-4">
                        <div className="space-y-1">
                            <CardTitle className="flex items-center gap-2">
                                <GitBranch className="size-5" /> Variants
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                                {variants.length} demographic variant
                                {variants.length === 1 ? '' : 's'} linked to
                                this family.
                            </p>
                        </div>
                        <Button
                            type="button"
                            onClick={() => setVariantsOpen(true)}
                        >
                            <Plus /> Create variants
                        </Button>
                    </CardHeader>
                    <CardContent className="grid gap-3">
                        {variants.length === 0 ? (
                            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                                No variants yet. Create reusable versions while
                                preserving the parent composition and style.
                            </div>
                        ) : (
                            variants.map((variant) => (
                                <div
                                    key={variant.id}
                                    className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center"
                                >
                                    <div className="size-16 overflow-hidden rounded-md bg-muted">
                                        {variant.thumbnail_url ? (
                                            <img
                                                src={variant.thumbnail_url}
                                                alt={variant.title}
                                                className="size-full object-cover"
                                            />
                                        ) : (
                                            <PromptImagePlaceholder className="size-full" />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="truncate font-medium">
                                                {variant.title}
                                            </p>
                                            <StatusBadge
                                                status={variant.status}
                                            />
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {[
                                                variant.variation_variables
                                                    ?.subject
                                                    ?.gender_presentation,
                                                variant.variation_variables
                                                    ?.subject?.age_group,
                                                variant.variation_variables
                                                    ?.subject?.age_range,
                                            ]
                                                .filter(Boolean)
                                                .join(' · ') ||
                                                'Custom demographic'}
                                        </p>
                                        {variant.error_message && (
                                            <p className="line-clamp-1 text-sm text-destructive">
                                                {variant.error_message}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            asChild
                                            size="sm"
                                            variant="outline"
                                        >
                                            <Link href={variant.edit_url}>
                                                Edit
                                            </Link>
                                        </Button>
                                        <Button
                                            asChild
                                            size="sm"
                                            variant="outline"
                                        >
                                            <Link
                                                href={PromptVariantController.regenerate(
                                                    {
                                                        prompt:
                                                            basePrompt?.id ??
                                                            promptItem.id,
                                                        variant: variant.id,
                                                    },
                                                )}
                                                method="post"
                                                preserveScroll
                                            >
                                                <RefreshCw /> Regenerate
                                            </Link>
                                        </Button>
                                        <Button
                                            asChild
                                            size="sm"
                                            variant="destructive"
                                        >
                                            <Link
                                                href={PromptVariantController.destroy(
                                                    {
                                                        prompt:
                                                            basePrompt?.id ??
                                                            promptItem.id,
                                                        variant: variant.id,
                                                    },
                                                )}
                                                method="delete"
                                                preserveScroll
                                            >
                                                <Trash2 /> Delete
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>

            <Dialog open={variantsOpen} onOpenChange={setVariantsOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Create prompt variants</DialogTitle>
                        <DialogDescription>
                            Generate independent drafts. The parent prompt and
                            assets are never modified.
                        </DialogDescription>
                    </DialogHeader>
                    <Form
                        {...PromptVariantController.store.form(
                            basePrompt?.id ?? promptItem.id,
                        )}
                        onSuccess={() => setVariantsOpen(false)}
                    >
                        {({ errors, processing }) => (
                            <div className="grid gap-5">
                                <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                                    <span className="font-medium">Parent:</span>{' '}
                                    {basePrompt?.title ?? promptItem.title}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                            setVariantRows([
                                                {
                                                    gender_presentation:
                                                        'woman',
                                                    age_group: 'young adult',
                                                    age_range: '25-34',
                                                    custom_instruction: '',
                                                },
                                                {
                                                    gender_presentation: 'man',
                                                    age_group:
                                                        'middle-aged adult',
                                                    age_range: '45-54',
                                                    custom_instruction: '',
                                                },
                                            ])
                                        }
                                    >
                                        Adult pair
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                            setVariantRows([
                                                {
                                                    gender_presentation: 'girl',
                                                    age_group: 'child',
                                                    age_range: '8-12',
                                                    custom_instruction: '',
                                                },
                                                {
                                                    gender_presentation: 'boy',
                                                    age_group: 'teenager',
                                                    age_range: '13-17',
                                                    custom_instruction: '',
                                                },
                                            ])
                                        }
                                    >
                                        Youth pair
                                    </Button>
                                </div>
                                {variantRows.map((row, index) => (
                                    <div
                                        key={index}
                                        className="grid gap-3 rounded-lg border p-3 md:grid-cols-3"
                                    >
                                        <VariantSelect
                                            label="Presentation"
                                            name={`variants[${index}][gender_presentation]`}
                                            value={row.gender_presentation}
                                            options={[
                                                'woman',
                                                'man',
                                                'girl',
                                                'boy',
                                                'gender-neutral adult',
                                            ]}
                                            onChange={(value) =>
                                                setVariantRows((rows) =>
                                                    rows.map(
                                                        (item, itemIndex) =>
                                                            itemIndex === index
                                                                ? {
                                                                      ...item,
                                                                      gender_presentation:
                                                                          value,
                                                                  }
                                                                : item,
                                                    ),
                                                )
                                            }
                                        />
                                        <VariantSelect
                                            label="Age group"
                                            name={`variants[${index}][age_group]`}
                                            value={row.age_group}
                                            options={[
                                                'child',
                                                'teenager',
                                                'young adult',
                                                'adult',
                                                'middle-aged adult',
                                                'older adult',
                                            ]}
                                            onChange={(value) =>
                                                setVariantRows((rows) =>
                                                    rows.map(
                                                        (item, itemIndex) =>
                                                            itemIndex === index
                                                                ? {
                                                                      ...item,
                                                                      age_group:
                                                                          value,
                                                                  }
                                                                : item,
                                                    ),
                                                )
                                            }
                                        />
                                        <div className="grid gap-2">
                                            <Label>Age range</Label>
                                            <Input
                                                name={`variants[${index}][age_range]`}
                                                value={row.age_range}
                                                onChange={(event) =>
                                                    setVariantRows((rows) =>
                                                        rows.map(
                                                            (
                                                                item,
                                                                itemIndex,
                                                            ) =>
                                                                itemIndex ===
                                                                index
                                                                    ? {
                                                                          ...item,
                                                                          age_range:
                                                                              event
                                                                                  .target
                                                                                  .value,
                                                                      }
                                                                    : item,
                                                        ),
                                                    )
                                                }
                                                placeholder="25-34"
                                            />
                                        </div>
                                        <div className="grid gap-2 md:col-span-3">
                                            <Label>
                                                Custom instruction (optional)
                                            </Label>
                                            <Input
                                                name={`variants[${index}][custom_instruction]`}
                                                value={row.custom_instruction}
                                                onChange={(event) =>
                                                    setVariantRows((rows) =>
                                                        rows.map(
                                                            (
                                                                item,
                                                                itemIndex,
                                                            ) =>
                                                                itemIndex ===
                                                                index
                                                                    ? {
                                                                          ...item,
                                                                          custom_instruction:
                                                                              event
                                                                                  .target
                                                                                  .value,
                                                                      }
                                                                    : item,
                                                        ),
                                                    )
                                                }
                                            />
                                        </div>
                                        {variantRows.length > 1 && (
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                className="md:col-span-3 md:justify-self-start"
                                                onClick={() =>
                                                    setVariantRows((rows) =>
                                                        rows.filter(
                                                            (_, itemIndex) =>
                                                                itemIndex !==
                                                                index,
                                                        ),
                                                    )
                                                }
                                            >
                                                Remove row
                                            </Button>
                                        )}
                                    </div>
                                ))}
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={variantRows.length >= 10}
                                    onClick={() =>
                                        setVariantRows((rows) => [
                                            ...rows,
                                            {
                                                gender_presentation: 'woman',
                                                age_group: 'adult',
                                                age_range: '',
                                                custom_instruction: '',
                                            },
                                        ])
                                    }
                                >
                                    <Plus /> Add variant
                                </Button>
                                {[
                                    'composition',
                                    'camera',
                                    'framing',
                                    'pose',
                                    'lighting',
                                    'background',
                                    'clothing_style',
                                    'color_palette',
                                    'mood',
                                    'image_effect',
                                    'negative_prompt_intent',
                                ].map((value) => (
                                    <input
                                        key={value}
                                        type="hidden"
                                        name="preserve[]"
                                        value={value}
                                    />
                                ))}
                                <VariantSelect
                                    label="Image handling"
                                    name="image_option"
                                    value="text_only"
                                    options={[
                                        'text_only',
                                        'generate_thumbnail',
                                        'reuse_reference',
                                        'generate_later',
                                    ]}
                                />
                                <FieldError
                                    message={fieldError(errors, 'variants')}
                                />
                                <DialogFooter>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setVariantsOpen(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={processing}>
                                        {processing ? (
                                            <LoaderCircle className="animate-spin" />
                                        ) : (
                                            <Sparkles />
                                        )}{' '}
                                        Create {variantRows.length} variant
                                        {variantRows.length === 1 ? '' : 's'}
                                    </Button>
                                </DialogFooter>
                            </div>
                        )}
                    </Form>
                </DialogContent>
            </Dialog>

            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete prompt?</DialogTitle>
                        <DialogDescription>
                            This removes the prompt record and local stored
                            assets. Imported source URLs are left untouched.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDeleteOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={deletePrompt}
                        >
                            <Trash2 />
                            Delete prompt
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={pushLiveOpen} onOpenChange={setPushLiveOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Push prompt to live?</DialogTitle>
                        <DialogDescription>
                            This sends the saved prompt fields and current
                            thumbnail to the configured live prompt API. Save
                            any edits first if you want them included.
                        </DialogDescription>
                    </DialogHeader>
                    <Form
                        {...PushPromptToLiveController.form(promptItem.id)}
                        onSuccess={() => setPushLiveOpen(false)}
                    >
                        {({ errors, processing }) => (
                            <div className="grid gap-4">
                                <FieldError
                                    message={fieldError(errors, 'push_live')}
                                />
                                <DialogFooter>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={processing}
                                        onClick={() => setPushLiveOpen(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={processing}>
                                        {processing ? (
                                            <LoaderCircle className="animate-spin" />
                                        ) : (
                                            <Rocket />
                                        )}
                                        {processing
                                            ? 'Pushing…'
                                            : 'Push to live'}
                                    </Button>
                                </DialogFooter>
                            </div>
                        )}
                    </Form>
                </DialogContent>
            </Dialog>

            <Dialog
                open={thumbnailOpen}
                onOpenChange={(open) => {
                    if (open) {
                        setThumbnailOpen(true);
                    } else {
                        closeThumbnailDialog();
                    }
                }}
            >
                <DialogContent>
                    <form className="grid gap-5" onSubmit={updateThumbnail}>
                        <DialogHeader>
                            <DialogTitle>Update thumbnail image</DialogTitle>
                            <DialogDescription>
                                Choose a JPG, PNG, or WEBP image up to 5MB. The
                                current thumbnail will be replaced after the
                                upload succeeds.
                            </DialogDescription>
                        </DialogHeader>

                        <button
                            type="button"
                            className="group relative overflow-hidden rounded-xl border border-dashed bg-muted/40 text-left transition-colors hover:border-primary/50 hover:bg-muted/70"
                            onClick={() => thumbnailInputRef.current?.click()}
                        >
                            {thumbnailPreviewUrl ? (
                                <img
                                    src={thumbnailPreviewUrl}
                                    alt="New thumbnail preview"
                                    className="aspect-[4/3] w-full object-cover"
                                />
                            ) : (
                                <span className="flex aspect-[4/3] flex-col items-center justify-center gap-3 p-6 text-center">
                                    <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                                        <Upload className="size-5" />
                                    </span>
                                    <span>
                                        <span className="block font-medium">
                                            Choose thumbnail image
                                        </span>
                                        <span className="mt-1 block text-sm text-muted-foreground">
                                            Click to browse your device
                                        </span>
                                    </span>
                                </span>
                            )}
                            {thumbnailPreviewUrl && (
                                <span className="absolute inset-x-3 bottom-3 rounded-lg bg-black/70 px-3 py-2 text-center text-sm font-medium text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
                                    Choose a different image
                                </span>
                            )}
                        </button>

                        <input
                            ref={thumbnailInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="sr-only"
                            onChange={(event) =>
                                selectThumbnail(event.target.files?.[0] ?? null)
                            }
                        />
                        <FieldError
                            message={fieldError(
                                thumbnailUpload.errors,
                                'thumbnail',
                            )}
                        />

                        {thumbnailUpload.progress && (
                            <div className="grid gap-2">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Uploading thumbnail</span>
                                    <span>
                                        {thumbnailUpload.progress.percentage}%
                                    </span>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-muted">
                                    <div
                                        className="h-full bg-primary transition-all"
                                        style={{
                                            width: `${thumbnailUpload.progress.percentage}%`,
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={thumbnailUpload.processing}
                                onClick={closeThumbnailDialog}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={
                                    thumbnailUpload.processing ||
                                    !thumbnailUpload.data.thumbnail
                                }
                            >
                                {thumbnailUpload.processing ? (
                                    <LoaderCircle className="animate-spin" />
                                ) : (
                                    <Upload />
                                )}
                                {thumbnailUpload.processing
                                    ? 'Uploading…'
                                    : 'Update thumbnail'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

function Metric({ label, value }: { label: string; value: number | string }) {
    return (
        <div className="rounded-lg border bg-white/70 p-3 shadow-sm backdrop-blur dark:bg-background/45">
            <div className="text-xs font-medium text-muted-foreground uppercase">
                {label}
            </div>
            <div className="mt-1 truncate text-lg font-semibold">{value}</div>
        </div>
    );
}

function TextField({
    error,
    icon: Icon,
    id,
    label,
    ...props
}: ComponentProps<'input'> & {
    error?: string;
    icon?: typeof CalendarClock;
    label: string;
}) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={id}>{label}</Label>
            <div className="relative">
                {Icon && (
                    <Icon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                )}
                <Input
                    id={id}
                    className={Icon ? 'pl-9' : undefined}
                    {...props}
                />
            </div>
            <FieldError message={error} />
        </div>
    );
}

function TextArea({
    className,
    error,
    id,
    label,
    ...props
}: ComponentProps<'textarea'> & {
    error?: string;
    label: string;
}) {
    return (
        <div className={className ? `grid gap-2 ${className}` : 'grid gap-2'}>
            <Label htmlFor={id}>{label}</Label>
            <textarea
                id={id}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                {...props}
            />
            <FieldError message={error} />
        </div>
    );
}

function FileField({
    error,
    id,
    label,
    name,
}: {
    error?: string;
    id: string;
    label: string;
    name: string;
}) {
    return (
        <div className="grid gap-2 rounded-lg border border-dashed p-4">
            <Label htmlFor={id} className="flex items-center gap-2">
                <ImageIcon className="size-4" />
                {label}
            </Label>
            <Input
                id={id}
                name={name}
                type="file"
                accept="image/jpeg,image/png,image/webp"
            />
            <p className="text-xs text-muted-foreground">
                JPG, PNG, or WEBP up to 5MB.
            </p>
            <FieldError message={error} />
        </div>
    );
}

function VariantSelect({
    label,
    name,
    value,
    options,
    onChange,
}: {
    label: string;
    name: string;
    value: string;
    options: string[];
    onChange?: (value: string) => void;
}) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={name}>{label}</Label>
            <select
                id={name}
                name={name}
                {...(onChange
                    ? {
                          value,
                          onChange: (event) => onChange(event.target.value),
                      }
                    : { defaultValue: value })}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs"
            >
                {options.map((option) => (
                    <option key={option} value={option}>
                        {humanize(option)}
                    </option>
                ))}
            </select>
        </div>
    );
}

function FieldError({ message }: { message?: string }) {
    if (!message) {
        return null;
    }

    return <p className="text-sm text-destructive">{message}</p>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-start justify-between gap-3 border-b pb-2 last:border-b-0 last:pb-0">
            <span className="text-muted-foreground">{label}</span>
            <span className="max-w-[14rem] text-right break-words">
                {value}
            </span>
        </div>
    );
}

function StatusBadge({ status }: { status: PromptStatus }) {
    const className =
        status === 'completed'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300'
            : status === 'failed'
              ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-300'
              : status === 'processing'
                ? 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/70 dark:bg-sky-950/40 dark:text-sky-300'
                : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300';

    return (
        <Badge variant="outline" className={className}>
            {statusLabels[status]}
        </Badge>
    );
}

function ModeBadge({ mode }: { mode: AdminPromptItem['generation_mode'] }) {
    const Icon =
        mode === 'auto' ? Bot : mode === 'imported' ? Sparkles : ImageIcon;

    return (
        <Badge variant="outline">
            <Icon className="size-3" />
            {generationModeLabels[mode]}
        </Badge>
    );
}

function fieldError(
    errors: Record<string, string | undefined>,
    field: string,
): string | undefined {
    return errors[field];
}

function providerLabel(prompt: AdminPromptItem): string {
    if (prompt.source_site) {
        return prompt.source_slug
            ? `${prompt.source_site} / ${prompt.source_slug}`
            : prompt.source_site;
    }

    if (prompt.ai_provider) {
        return prompt.ai_model
            ? `${prompt.ai_provider} / ${prompt.ai_model}`
            : prompt.ai_provider;
    }

    return prompt.user?.name ?? 'Local prompt';
}

function humanize(value: string): string {
    return value
        .replaceAll('_', ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null): string {
    return value ? value.slice(0, 10) : 'Not set';
}

function dateTimeLocal(value: string | null): string {
    return value ? value.slice(0, 16) : '';
}

EditPrompt.layout = {
    breadcrumbs: [
        {
            title: 'Prompt Management',
            href: AdminPromptController.index(),
        },
        {
            title: 'Edit Prompt',
            href: '#',
        },
    ],
};
