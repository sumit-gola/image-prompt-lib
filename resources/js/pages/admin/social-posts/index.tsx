import { Form, Head, Link, router, usePoll } from '@inertiajs/react';
import {
    ExternalLink,
    LoaderCircle,
    RefreshCw,
    Send,
    Share2,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import SocialPostController from '@/actions/App/Http/Controllers/Admin/SocialPostController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { Paginated } from '@/types';

type SocialPost = {
    id: number;
    platform: string;
    status: string;
    title: string | null;
    caption: string | null;
    hashtags: string[];
    alt_text: string | null;
    remote_url: string | null;
    error_message: string | null;
    published_at: string | null;
    updated_at: string | null;
    prompt: { id: number; title: string };
};
type Account = {
    platform: string;
    url: string;
    configured: boolean;
    supports_publish: boolean;
    supports_update: boolean;
    supports_delete: boolean;
};
type Props = {
    posts: Paginated<SocialPost>;
    prompts: Array<{ id: number; title: string }>;
    accounts: Account[];
};

export default function SocialPostsIndex({ posts, prompts, accounts }: Props) {
    const [promptId, setPromptId] = useState(prompts[0]?.id.toString() ?? '');
    const [editing, setEditing] = useState<SocialPost | null>(null);
    usePoll(
        3000,
        { only: ['posts'] },
        {
            autoStart: posts.data.some((post) =>
                ['queued', 'generating', 'publishing'].includes(post.status),
            ),
        },
    );

    return (
        <>
            <Head title="Social Publishing" />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 sm:p-6">
                <header className="rounded-xl border bg-gradient-to-br from-violet-50 via-background to-cyan-50 p-5 dark:from-violet-950/30 dark:to-cyan-950/20">
                    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                        <div>
                            <h1 className="flex items-center gap-2 text-3xl font-semibold">
                                <Share2 /> Social publishing
                            </h1>
                            <p className="mt-2 text-muted-foreground">
                                Generate platform-specific copy, publish prompt
                                artwork, and manage remote posts.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {accounts.map((account) => (
                                <Button
                                    key={account.platform}
                                    asChild
                                    size="sm"
                                    variant="outline"
                                >
                                    <a
                                        href={account.url}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        {account.platform} <ExternalLink />
                                    </a>
                                </Button>
                            ))}
                        </div>
                    </div>
                </header>

                <div className="grid gap-6 xl:grid-cols-[22rem_1fr]">
                    <Card className="h-fit">
                        <CardHeader>
                            <CardTitle>Create social posts</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Form
                                {...SocialPostController.store.form()}
                                className="grid gap-4"
                            >
                                {({ errors, processing }) => (
                                    <>
                                        <input
                                            type="hidden"
                                            name="prompt_id"
                                            value={promptId}
                                        />
                                        <div className="grid gap-2">
                                            <Label>Prompt</Label>
                                            <Select
                                                value={promptId}
                                                onValueChange={setPromptId}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Choose prompt" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {prompts.map((prompt) => (
                                                        <SelectItem
                                                            key={prompt.id}
                                                            value={prompt.id.toString()}
                                                        >
                                                            {prompt.title}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Platforms</Label>
                                            {accounts.map((account) => (
                                                <label
                                                    key={account.platform}
                                                    className="flex items-center justify-between rounded-lg border p-3"
                                                >
                                                    <span className="capitalize">
                                                        {account.platform}
                                                    </span>
                                                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        {account.supports_publish
                                                            ? account.configured
                                                                ? 'Connected'
                                                                : 'Needs credentials'
                                                            : 'Manual only'}
                                                        <input
                                                            type="checkbox"
                                                            name="platforms[]"
                                                            value={
                                                                account.platform
                                                            }
                                                        />
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                        <label className="flex items-center gap-2 text-sm">
                                            <input
                                                type="hidden"
                                                name="publish_now"
                                                value="0"
                                            />
                                            <input
                                                type="checkbox"
                                                name="publish_now"
                                                value="1"
                                                defaultChecked
                                            />{' '}
                                            Publish immediately after writing
                                        </label>
                                        {(errors.platforms ||
                                            errors.prompt_id) && (
                                            <p className="text-sm text-destructive">
                                                {errors.platforms ??
                                                    errors.prompt_id}
                                            </p>
                                        )}
                                        <Button
                                            disabled={processing || !promptId}
                                        >
                                            {processing ? (
                                                <LoaderCircle className="animate-spin" />
                                            ) : (
                                                <Send />
                                            )}{' '}
                                            Generate and publish
                                        </Button>
                                    </>
                                )}
                            </Form>
                        </CardContent>
                    </Card>

                    <div className="grid gap-4">
                        {posts.data.length === 0 && (
                            <Card>
                                <CardContent className="p-10 text-center text-muted-foreground">
                                    No social posts yet.
                                </CardContent>
                            </Card>
                        )}
                        {posts.data.map((post) => {
                            const account = accounts.find(
                                (item) => item.platform === post.platform,
                            );
                            return (
                                <Card key={post.id}>
                                    <CardHeader className="flex-row items-start justify-between">
                                        <div>
                                            <CardTitle>
                                                {post.title ??
                                                    post.prompt.title}
                                            </CardTitle>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                {post.prompt.title}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Badge
                                                className="capitalize"
                                                variant="outline"
                                            >
                                                {post.platform}
                                            </Badge>
                                            <Badge
                                                variant={
                                                    post.status === 'failed'
                                                        ? 'destructive'
                                                        : 'secondary'
                                                }
                                                className="capitalize"
                                            >
                                                {post.status}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="grid gap-4">
                                        <p className="text-sm leading-6 whitespace-pre-wrap">
                                            {post.caption ??
                                                'Copy is being generated…'}
                                        </p>
                                        {post.hashtags.length > 0 && (
                                            <p className="text-sm text-primary">
                                                {post.hashtags
                                                    .map((tag) => `#${tag}`)
                                                    .join(' ')}
                                            </p>
                                        )}
                                        {post.error_message && (
                                            <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                                                {post.error_message}
                                            </p>
                                        )}
                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setEditing(post)}
                                            >
                                                Edit
                                            </Button>
                                            <Button
                                                asChild
                                                size="sm"
                                                variant="outline"
                                            >
                                                <Link
                                                    href={SocialPostController.retry(
                                                        post.id,
                                                    )}
                                                    method="post"
                                                    preserveScroll
                                                >
                                                    <RefreshCw /> Retry
                                                </Link>
                                            </Button>
                                            {post.remote_url && (
                                                <Button
                                                    asChild
                                                    size="sm"
                                                    variant="outline"
                                                >
                                                    <a
                                                        href={post.remote_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                    >
                                                        <ExternalLink /> View
                                                        live
                                                    </a>
                                                </Button>
                                            )}
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() =>
                                                    router.delete(
                                                        SocialPostController.destroy(
                                                            post.id,
                                                        ),
                                                    )
                                                }
                                            >
                                                <Trash2 /> Delete
                                                {account?.supports_delete
                                                    ? ' everywhere'
                                                    : ' record'}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            </div>

            <Dialog
                open={editing !== null}
                onOpenChange={(open) => !open && setEditing(null)}
            >
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit social post</DialogTitle>
                    </DialogHeader>
                    {editing && (
                        <Form
                            {...SocialPostController.update.form(editing.id)}
                            onSuccess={() => setEditing(null)}
                            className="grid gap-4"
                        >
                            {({ processing, errors }) => (
                                <>
                                    <div className="grid gap-2">
                                        <Label>Title</Label>
                                        <input
                                            className="rounded-md border bg-background px-3 py-2"
                                            name="title"
                                            defaultValue={editing.title ?? ''}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Caption</Label>
                                        <textarea
                                            className="min-h-48 rounded-md border bg-background px-3 py-2"
                                            name="caption"
                                            defaultValue={editing.caption ?? ''}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Hashtags</Label>
                                        {editing.hashtags.map((tag, index) => (
                                            <input
                                                key={index}
                                                className="rounded-md border bg-background px-3 py-2"
                                                name={`hashtags[${index}]`}
                                                defaultValue={tag}
                                            />
                                        ))}
                                    </div>
                                    <input
                                        type="hidden"
                                        name="alt_text"
                                        value={editing.alt_text ?? ''}
                                    />
                                    <label className="flex items-center gap-2 text-sm">
                                        <input
                                            type="hidden"
                                            name="sync_remote"
                                            value="0"
                                        />
                                        <input
                                            type="checkbox"
                                            name="sync_remote"
                                            value="1"
                                            defaultChecked
                                        />{' '}
                                        Update the live post when supported
                                    </label>
                                    {errors.social && (
                                        <p className="text-sm text-destructive">
                                            {errors.social}
                                        </p>
                                    )}
                                    <DialogFooter>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setEditing(null)}
                                        >
                                            Cancel
                                        </Button>
                                        <Button disabled={processing}>
                                            {processing && (
                                                <LoaderCircle className="animate-spin" />
                                            )}{' '}
                                            Save
                                        </Button>
                                    </DialogFooter>
                                </>
                            )}
                        </Form>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

SocialPostsIndex.layout = {
    breadcrumbs: [
        { title: 'Social Publishing', href: SocialPostController.index() },
    ],
};
