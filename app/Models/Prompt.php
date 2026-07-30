<?php

namespace App\Models;

use Database\Factories\PromptFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $user_id
 * @property string $title
 * @property string|null $prompt
 * @property string|null $negative_prompt
 * @property string $thumbnail_path
 * @property string $reference_image_path
 * @property string|null $category
 * @property array<string, string>|null $style_notes
 * @property string|null $ai_provider
 * @property string|null $ai_model
 * @property string $status
 * @property int $copy_count
 * @property string|null $error_message
 * @property Carbon|null $generated_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'user_id',
    'title',
    'prompt',
    'negative_prompt',
    'thumbnail_path',
    'reference_image_path',
    'category',
    'style_notes',
    'ai_provider',
    'ai_model',
    'status',
    'copy_count',
    'error_message',
    'generated_at',
])]
class Prompt extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_PROCESSING = 'processing';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_FAILED = 'failed';

    public const CATEGORY_PORTRAIT = 'portrait';

    public const CATEGORY_PRODUCT = 'product';

    public const CATEGORY_FASHION = 'fashion';

    public const CATEGORY_LIFESTYLE = 'lifestyle';

    public const CATEGORY_ART = 'art';

    public const CATEGORY_OTHER = 'other';

    public const CATEGORIES = [
        self::CATEGORY_PORTRAIT,
        self::CATEGORY_PRODUCT,
        self::CATEGORY_FASHION,
        self::CATEGORY_LIFESTYLE,
        self::CATEGORY_ART,
        self::CATEGORY_OTHER,
    ];

    /** @use HasFactory<PromptFactory> */
    use HasFactory;

    /**
     * @var array<string, mixed>
     */
    protected $attributes = [
        'copy_count' => 0,
    ];

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @param  Builder<Prompt>  $query
     * @return Builder<Prompt>
     */
    public function scopeCompleted(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_COMPLETED);
    }

    public static function normalizeCategory(mixed $category): string
    {
        return is_string($category) && in_array($category, self::CATEGORIES, true)
            ? $category
            : self::CATEGORY_OTHER;
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'style_notes' => 'array',
            'copy_count' => 'integer',
            'generated_at' => 'datetime',
        ];
    }
}
