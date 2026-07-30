export type PromptCategory =
    | 'portrait'
    | 'product'
    | 'fashion'
    | 'lifestyle'
    | 'art'
    | 'other';

export type PromptStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type PromptSort = 'newest' | 'most_copied' | 'oldest' | 'category';

export type PromptStatusSummary = {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
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
};

export type PromptLibraryItem = {
    id: number;
    title: string;
    prompt: string | null;
    prompt_preview: string;
    negative_prompt: string | null;
    thumbnail_url: string;
    reference_image_url: string;
    detail_url: string;
    category: PromptCategory | null;
    style_notes: PromptStyleNotes | null;
    copy_count: number;
    generated_at: string | null;
    created_at: string | null;
};

export type AdminPromptItem = PromptLibraryItem & {
    status: PromptStatus;
    error_message: string | null;
    ai_provider: string | null;
    ai_model: string | null;
    user: {
        id: number;
        name: string;
        email: string;
    } | null;
};

export type DashboardPromptItem = {
    id: number;
    title: string;
    thumbnail_url: string;
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
    from: number | null;
    to: number | null;
    total: number;
    prev_page_url: string | null;
    next_page_url: string | null;
};
