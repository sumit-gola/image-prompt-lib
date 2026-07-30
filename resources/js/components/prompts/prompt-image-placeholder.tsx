import { ImageIcon, WandSparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
    className?: string;
    compact?: boolean;
};

export function PromptImagePlaceholder({ className, compact = false }: Props) {
    return (
        <div
            className={cn(
                'grid place-items-center overflow-hidden bg-[linear-gradient(135deg,rgb(255_255_255_/_0.76),rgb(237_233_254_/_0.50),rgb(224_242_254_/_0.44))] text-lumen-soft dark:bg-[linear-gradient(135deg,rgb(255_255_255_/_0.08),rgb(124_58_237_/_0.12),rgb(34_211_238_/_0.10))]',
                className,
            )}
        >
            <div className="grid place-items-center gap-2 text-center">
                <span className="grid size-12 place-items-center rounded-2xl border border-lumen-line bg-white/[0.68] text-lumen-accent shadow-sm backdrop-blur dark:bg-white/[0.08] dark:shadow-none">
                    {compact ? (
                        <ImageIcon className="size-5" />
                    ) : (
                        <WandSparkles className="size-5" />
                    )}
                </span>
                {!compact && (
                    <span className="px-4 text-xs font-semibold text-lumen-muted uppercase">
                        Thumbnail pending
                    </span>
                )}
            </div>
        </div>
    );
}
