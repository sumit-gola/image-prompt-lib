export type PromptCategory =
    | 'portrait'
    | 'product'
    | 'fashion'
    | 'lifestyle'
    | 'art'
    | 'other';

export type PromptStatus = 'pending' | 'processing' | 'completed' | 'failed';

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
    negative_prompt: string | null;
    thumbnail_url: string;
    reference_image_url: string;
    category: PromptCategory | null;
    style_notes: PromptStyleNotes | null;
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
