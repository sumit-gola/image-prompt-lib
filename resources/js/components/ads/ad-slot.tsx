import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { AdSenseConfig } from '@/types';

declare global {
    interface Window {
        adsbygoogle?: Record<string, unknown>[];
    }
}

type AdSlotProps = {
    adSlot?: string | null;
    className?: string;
    config?: AdSenseConfig | null;
    label?: string;
};

export function AdSlot({
    adSlot,
    className,
    config,
    label = 'Advertisement',
}: AdSlotProps) {
    const pushed = useRef(false);
    const canRender = Boolean(config?.enabled && (adSlot || config.test_mode));

    useEffect(() => {
        if (
            !canRender ||
            config?.test_mode ||
            !config?.client_id ||
            !adSlot ||
            pushed.current
        ) {
            return;
        }

        const timeout = window.setTimeout(() => {
            try {
                window.adsbygoogle = window.adsbygoogle ?? [];
                window.adsbygoogle.push({});
                pushed.current = true;
            } catch {
                pushed.current = false;
            }
        }, 0);

        return () => window.clearTimeout(timeout);
    }, [adSlot, canRender, config?.client_id, config?.test_mode]);

    if (!canRender) {
        return null;
    }

    return (
        <section
            aria-label={label}
            className={cn(
                'overflow-hidden rounded-[1.35rem] border border-lumen-line bg-white/[0.58] p-3 text-lumen-muted shadow-sm backdrop-blur-xl dark:bg-white/[0.045] dark:shadow-none',
                className,
            )}
        >
            <div className="mb-2 flex items-center justify-between gap-3 px-1">
                <span className="text-[11px] font-semibold tracking-[0.18em] uppercase">
                    {label}
                </span>
                {config?.test_mode && (
                    <span className="rounded-full border border-lumen-line bg-white/[0.72] px-2 py-0.5 text-[11px] font-semibold text-lumen-soft dark:bg-white/[0.06]">
                        Test mode
                    </span>
                )}
            </div>

            {config?.test_mode ? (
                <div className="grid min-h-28 place-items-center rounded-2xl border border-dashed border-lumen-line bg-white/[0.52] px-4 text-center text-sm text-lumen-soft dark:bg-white/[0.035]">
                    Ad placement reserved. Live AdSense rendering starts when a
                    valid client ID and slot are configured.
                </div>
            ) : (
                <ins
                    className="adsbygoogle block min-h-28"
                    data-ad-client={config?.client_id ?? undefined}
                    data-ad-slot={adSlot ?? undefined}
                    data-ad-format="auto"
                    data-full-width-responsive="true"
                />
            )}
        </section>
    );
}

export function ResponsiveAdSlot(props: AdSlotProps) {
    return <AdSlot {...props} />;
}
