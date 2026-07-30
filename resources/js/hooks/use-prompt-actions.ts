import { useHttp } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import PromptController from '@/actions/App/Http/Controllers/PromptController';
import { useClipboard } from '@/hooks/use-clipboard';
import type { PromptLibraryItem } from '@/types';

type CopyResponse = {
    copy_count: number;
};

type ShareStatus = 'shared' | 'link-copied' | null;

export function usePromptActions(prompt: PromptLibraryItem) {
    const [, copyToClipboard] = useClipboard();
    const { post } = useHttp<Record<string, never>, CopyResponse>({});
    const [copyCount, setCopyCount] = useState(prompt.copy_count);
    const [copiedValue, setCopiedValue] = useState<string | null>(null);
    const [shareStatus, setShareStatus] = useState<ShareStatus>(null);

    useEffect(() => {
        if (!copiedValue) {
            return;
        }

        const timeout = window.setTimeout(() => setCopiedValue(null), 1600);

        return () => window.clearTimeout(timeout);
    }, [copiedValue]);

    useEffect(() => {
        if (!shareStatus) {
            return;
        }

        const timeout = window.setTimeout(() => setShareStatus(null), 1600);

        return () => window.clearTimeout(timeout);
    }, [shareStatus]);

    const copyText = async (value: string): Promise<boolean> => {
        if (value === '') {
            return false;
        }

        const copied = await copyToClipboard(value);

        if (copied) {
            setCopiedValue(value);
        }

        return copied;
    };

    const copyPrompt = async (): Promise<boolean> => {
        const promptText = prompt.prompt ?? '';
        const copied = await copyText(promptText);

        if (!copied) {
            return false;
        }

        setCopyCount((count) => count + 1);

        try {
            const response = await post(PromptController.copy.url(prompt.id));

            setCopyCount(response.copy_count);
        } catch {
            setCopyCount((count) => Math.max(0, count - 1));
        }

        return true;
    };

    const sharePrompt = async (): Promise<void> => {
        const url = new URL(prompt.detail_url, window.location.origin).toString();
        const text = prompt.prompt_preview || prompt.title;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: prompt.title,
                    text,
                    url,
                });
                setShareStatus('shared');

                return;
            } catch (error) {
                if (error instanceof DOMException && error.name === 'AbortError') {
                    return;
                }
            }
        }

        const copied = await copyToClipboard(url);

        if (copied) {
            setShareStatus('link-copied');
        }
    };

    return {
        copiedValue,
        copyCount,
        copyPrompt,
        copyText,
        sharePrompt,
        shareStatus,
    };
}
