import { Head } from '@inertiajs/react';
import type { AdSenseConfig } from '@/types';

type Props = {
    config?: AdSenseConfig | null;
};

export function AdSenseScript({ config }: Props) {
    if (!config?.enabled || config.test_mode || !config.client_id) {
        return null;
    }

    return (
        <Head>
            <script
                async
                src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(config.client_id)}`}
                crossOrigin="anonymous"
                data-ad-client={config.client_id}
                head-key="adsense-script"
            />
        </Head>
    );
}
