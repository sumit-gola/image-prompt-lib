export type PromptCategory =
    'portrait' | 'product' | 'fashion' | 'lifestyle' | 'art' | 'other';

export type PromptStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type PromptGenerationMode =
    'reference_image' | 'auto' | 'imported' | 'variant';

export type PromptVariationVariables = {
    subject?: {
        gender_presentation?: string | null;
        age_group?: string | null;
        age_range?: string | null;
        custom_instruction?: string | null;
    };
    preserve?: string[];
    image_option?: string;
    generation?: {
        change_summary?: string[];
        preserved_elements?: string[];
        safety_notes?: string[];
    };
};

export type PromptSort =
    'newest' | 'popular' | 'most_copied' | 'oldest' | 'category';

export type PromptStatusSummary = {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    imported: number;
    auto: number;
    reference_image: number;
    total_copies: number;
    latest_generated_at: string | null;
    failed_needing_attention: number;
};

export type PromptAiConfiguration = {
    provider: string | null;
    model: string | null;
    timeout: number;
    is_configured: boolean;
    message: string | null;
    credential_env: string | null;
};

export type PromptStyleNotes = {
    subject: string;
    composition: string;
    camera_angle: string;
    lighting: string;
    background: string;
    colors: string;
    mood: string;
    quality: string;
    dynamic_subject_guidance?: string;
};

export type PromptLibraryItem = {
    id: number;
    title: string;
    prompt: string | null;
    prompt_preview: string;
    negative_prompt: string | null;
    thumbnail_prompt: string | null;
    thumbnail_url: string | null;
    reference_image_url: string | null;
    image_alt: string;
    detail_url: string;
    generation_mode: PromptGenerationMode;
    is_template?: boolean;
    base_prompt_id?: number | null;
    base_prompt?: {
        id: number;
        title: string;
        detail_url: string;
    } | null;
    variation_preset?: string | null;
    variation_variables?: PromptVariationVariables | null;
    source_idea: string | null;
    category: PromptCategory | null;
    style_notes: PromptStyleNotes | null;
    copy_count: number;
    source_label: string | null;
    model_label: string | null;
    generated_at: string | null;
    created_at: string | null;
};

export type PromptSeoMeta = {
    title: string;
    description: string;
    canonical_url: string;
    robots: string;
    open_graph: {
        type: string;
        title: string;
        description: string;
        url: string;
        image: string | null;
    };
    twitter: {
        card: string;
        title: string;
        description: string;
        image: string | null;
    };
    structured_data: Record<string, unknown>[];
};

export type PromptTrend = {
    label: string;
    category: PromptCategory | null;
    search: string;
    count: number;
};

export type PromptCollectionItem = {
    category: PromptCategory;
    title: string;
    description: string;
    prompt_count: number;
    thumbnails: string[];
};

export type PromptModelCount = {
    model: string;
    label: string;
    count: number;
};

export type AdSenseSlotKey = 'home' | 'library' | 'detail';

export type AdSenseConfig = {
    enabled: boolean;
    client_id: string | null;
    test_mode: boolean;
    slots: Record<AdSenseSlotKey, string | null>;
};

export type AdminPromptItem = PromptLibraryItem & {
    status: PromptStatus;
    source_site: string | null;
    source_slug: string | null;
    source_url: string | null;
    source_thumbnail_url: string | null;
    can_regenerate: boolean;
    error_message: string | null;
    ai_provider: string | null;
    ai_model: string | null;
    edit_url: string;
    user: {
        id: number;
        name: string;
        email: string;
    } | null;
};

export type DashboardPromptItem = {
    id: number;
    title: string;
    thumbnail_url: string | null;
    category: PromptCategory | null;
    status: PromptStatus;
    error_message: string | null;
    generated_at: string | null;
    created_at: string | null;
};

export type Paginated<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    from: number | null;
    to: number | null;
    total: number;
    prev_page_url: string | null;
    next_page_url: string | null;
};
