import { Head } from '@inertiajs/react';
import type { PromptSeoMeta } from '@/types';

type Props = {
    seo: PromptSeoMeta;
};

export function PromptSeoHead({ seo }: Props) {
    return (
        <Head title={seo.title}>
            <meta
                head-key="description"
                name="description"
                content={seo.description}
            />
            <meta head-key="robots" name="robots" content={seo.robots} />
            <link
                head-key="canonical"
                rel="canonical"
                href={seo.canonical_url}
            />

            <meta
                head-key="og:type"
                property="og:type"
                content={seo.open_graph.type}
            />
            <meta
                head-key="og:title"
                property="og:title"
                content={seo.open_graph.title}
            />
            <meta
                head-key="og:description"
                property="og:description"
                content={seo.open_graph.description}
            />
            <meta
                head-key="og:url"
                property="og:url"
                content={seo.open_graph.url}
            />
            {seo.open_graph.image && (
                <meta
                    head-key="og:image"
                    property="og:image"
                    content={seo.open_graph.image}
                />
            )}

            <meta
                head-key="twitter:card"
                name="twitter:card"
                content={seo.twitter.card}
            />
            <meta
                head-key="twitter:title"
                name="twitter:title"
                content={seo.twitter.title}
            />
            <meta
                head-key="twitter:description"
                name="twitter:description"
                content={seo.twitter.description}
            />
            {seo.twitter.image && (
                <meta
                    head-key="twitter:image"
                    name="twitter:image"
                    content={seo.twitter.image}
                />
            )}

            <script head-key="structured-data" type="application/ld+json">
                {JSON.stringify(seo.structured_data)}
            </script>
        </Head>
    );
}
