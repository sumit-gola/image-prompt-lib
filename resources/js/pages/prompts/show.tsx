import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Check, Copy } from 'lucide-react';
import PromptController from '@/actions/App/Http/Controllers/PromptController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useClipboard } from '@/hooks/use-clipboard';
import type {
    PromptCategory,
    PromptLibraryItem,
    PromptStyleNotes,
} from '@/types';

const categoryLabels: Record<PromptCategory, string> = {
    portrait: 'Portrait',
    product: 'Product',
    fashion: 'Fashion',
    lifestyle: 'Lifestyle',
    art: 'Art',
    other: 'Other',
};

type Props = {
    promptItem: PromptLibraryItem;
};

export default function PromptShow({ promptItem }: Props) {
    const [copiedText, copy] = useClipboard();
    const promptText = promptItem.prompt ?? '';

    return (
        <>
            <Head title={promptItem.title} />

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto p-4">
                <div className="flex flex-col gap-3 border-b pb-5">
                    <Button asChild variant="ghost" size="sm" className="w-fit">
                        <Link href={PromptController.index()}>
                            <ArrowLeft />
                            Prompt Library
                        </Link>
                    </Button>

                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                            <h1 className="text-2xl font-semibold tracking-normal">
                                {promptItem.title}
                            </h1>
                            {promptItem.category && (
                                <Badge variant="secondary">
                                    {categoryLabels[promptItem.category]}
                                </Badge>
                            )}
                        </div>

                        <Button
                            type="button"
                            onClick={() => copy(promptText)}
                            disabled={promptText === ''}
                        >
                            {copiedText === promptText ? <Check /> : <Copy />}
                            Copy prompt
                        </Button>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                    <div className="space-y-4">
                        <img
                            src={promptItem.reference_image_url}
                            alt={promptItem.title}
                            className="aspect-[4/5] w-full rounded-lg border object-cover"
                        />

                        {promptItem.style_notes && (
                            <StyleNotes notes={promptItem.style_notes} />
                        )}
                    </div>

                    <div className="space-y-4">
                        <PromptPanel
                            title="Prompt"
                            value={promptText}
                            copiedText={copiedText}
                            copy={copy}
                        />

                        {promptItem.negative_prompt && (
                            <PromptPanel
                                title="Negative prompt"
                                value={promptItem.negative_prompt}
                                copiedText={copiedText}
                                copy={copy}
                            />
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

function PromptPanel({
    title,
    value,
    copiedText,
    copy,
}: {
    title: string;
    value: string;
    copiedText: string | null;
    copy: (value: string) => Promise<boolean>;
}) {
    return (
        <Card>
            <CardContent className="space-y-4 p-5">
                <div className="flex items-center justify-between gap-3">
                    <h2 className="text-base font-semibold">{title}</h2>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => copy(value)}
                    >
                        {copiedText === value ? <Check /> : <Copy />}
                        Copy
                    </Button>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground">
                    {value}
                </p>
            </CardContent>
        </Card>
    );
}

function StyleNotes({ notes }: { notes: PromptStyleNotes }) {
    return (
        <Card>
            <CardContent className="grid gap-3 p-5">
                {Object.entries(notes).map(([key, value]) => (
                    <div
                        key={key}
                        className="grid gap-1 border-b pb-3 last:border-b-0 last:pb-0"
                    >
                        <dt className="text-xs font-medium uppercase text-muted-foreground">
                            {key.replace('_', ' ')}
                        </dt>
                        <dd className="text-sm leading-6">{value}</dd>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

PromptShow.layout = {
    breadcrumbs: [
        {
            title: 'Prompt Library',
            href: PromptController.index(),
        },
    ],
};
