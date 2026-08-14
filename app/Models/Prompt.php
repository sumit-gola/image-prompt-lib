<?php

namespace App\Models;

use Database\Factories\PromptFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use LogicException;

/**
 * @property int $id
 * @property string $prompt_id
 * @property int $user_id
 * @property string $title
 * @property string|null $prompt
 * @property string|null $negative_prompt
 * @property string|null $thumbnail_prompt
 * @property string|null $thumbnail_path
 * @property string|null $reference_image_path
 * @property string $generation_mode
 * @property string|null $source_idea
 * @property string|null $source_site
 * @property string|null $source_slug
 * @property string|null $source_url
 * @property string|null $source_thumbnail_url
 * @property Carbon|null $source_published_at
 * @property Carbon|null $source_modified_at
 * @property string|null $category
 * @property array<string, string|null>|null $style_notes
 * @property string|null $ai_provider
 * @property string|null $ai_model
 * @property int|null $base_prompt_id
 * @property string|null $variation_preset
 * @property string|null $variation_key
 * @property array<string, mixed>|null $variation_variables
 * @property string $status
 * @property int $copy_count
 * @property string|null $error_message
 * @property Carbon|null $reviewed_at
 * @property Carbon|null $generated_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'user_id',
    'title',
    'prompt',
    'negative_prompt',
    'thumbnail_prompt',
    'thumbnail_path',
    'reference_image_path',
    'generation_mode',
    'source_idea',
    'source_site',
    'source_slug',
    'source_url',
    'source_thumbnail_url',
    'source_published_at',
    'source_modified_at',
    'category',
    'style_notes',
    'ai_provider',
    'ai_model',
    'is_template',
    'base_prompt_id',
    'variation_preset',
    'variation_key',
    'variation_variables',
    'image_rights_status',
    'image_rights_basis',
    'image_rights_evidence',
    'image_rights_verified_at',
    'status',
    'copy_count',
    'error_message',
    'generated_at',
])]
class Prompt extends Model
{
    use HasUuids;

    public const STATUS_PENDING = 'pending';

    public const STATUS_PROCESSING = 'processing';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_FAILED = 'failed';

    public const STATUSES = [
        self::STATUS_PENDING,
        self::STATUS_PROCESSING,
        self::STATUS_COMPLETED,
        self::STATUS_FAILED,
    ];

    public const GENERATION_MODE_REFERENCE_IMAGE = 'reference_image';

    public const GENERATION_MODE_AUTO = 'auto';

    public const GENERATION_MODE_IMPORTED = 'imported';

    public const GENERATION_MODE_VARIANT = 'variant';

    public const GENERATION_MODES = [
        self::GENERATION_MODE_REFERENCE_IMAGE,
        self::GENERATION_MODE_AUTO,
        self::GENERATION_MODE_IMPORTED,
        self::GENERATION_MODE_VARIANT,
    ];

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

    protected static function booted(): void
    {
        static::saving(function (Prompt $prompt): void {
            if ($prompt->base_prompt_id === null) {
                return;
            }

            if ($prompt->exists && $prompt->base_prompt_id === $prompt->id) {
                throw new LogicException('A prompt cannot be its own parent.');
            }

            $parent = self::query()->find($prompt->base_prompt_id);
            $visited = $prompt->exists ? [$prompt->id => true] : [];

            while ($parent instanceof self) {
                if (isset($visited[$parent->id])) {
                    throw new LogicException('Circular prompt variant relationships are not allowed.');
                }

                $visited[$parent->id] = true;
                $parent = $parent->base_prompt_id === null
                    ? null
                    : self::query()->find($parent->base_prompt_id);
            }
        });

        static::deleting(function (Prompt $prompt): void {
            if ($prompt->variants()->exists()) {
                throw new LogicException('A parent prompt with variants cannot be deleted.');
            }
        });
    }

    /** @use HasFactory<PromptFactory> */
    use HasFactory;

    /**
     * @return array<int, string>
     */
    public function uniqueIds(): array
    {
        return ['prompt_id'];
    }

    /**
     * @var array<string, mixed>
     */
    protected $attributes = [
        'copy_count' => 0,
        'generation_mode' => self::GENERATION_MODE_REFERENCE_IMAGE,
    ];

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<Prompt, $this> */
    public function basePrompt(): BelongsTo
    {
        return $this->belongsTo(self::class, 'base_prompt_id');
    }

    /** @return HasMany<Prompt, $this> */
    public function variants(): HasMany
    {
        return $this->hasMany(self::class, 'base_prompt_id');
    }

    public function isVariant(): bool
    {
        return $this->base_prompt_id !== null;
    }

    public function rootPrompt(): self
    {
        $prompt = $this;
        $visited = [];

        while ($prompt->base_prompt_id !== null && ! isset($visited[$prompt->id])) {
            $visited[$prompt->id] = true;
            $parent = $prompt->basePrompt()->first();

            if (! $parent instanceof self) {
                break;
            }

            $prompt = $parent;
        }

        return $prompt;
    }

    /** @param array<string, mixed> $variables */
    public function hasVariantFor(array $variables): bool
    {
        return $this->rootPrompt()->variants()
            ->where('variation_preset', 'subject-demographic')
            ->where('variation_key', self::variationKey($variables))
            ->exists();
    }

    public function variantCount(): int
    {
        return $this->rootPrompt()->variants()->count();
    }

    /** @param array<string, mixed> $variables */
    public static function variationKey(array $variables): string
    {
        $subject = is_array($variables['subject'] ?? null) ? $variables['subject'] : $variables;
        ksort($subject);

        return hash('sha256', json_encode($subject, JSON_THROW_ON_ERROR));
    }

    /**
     * @param  Builder<Prompt>  $query
     * @return Builder<Prompt>
     */
    public function scopeCompleted(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_COMPLETED);
    }

    /**
     * @param  Builder<Prompt>  $query
     * @return Builder<Prompt>
     */
    public function scopeSearch(Builder $query, ?string $search): Builder
    {
        $search = is_string($search) ? trim($search) : '';

        if ($search === '') {
            return $query;
        }

        return $query->where(function (Builder $query) use ($search): void {
            $query->where('title', 'like', "%{$search}%")
                ->orWhere('prompt', 'like', "%{$search}%")
                ->orWhere('source_idea', 'like', "%{$search}%")
                ->orWhere('source_url', 'like', "%{$search}%")
                ->orWhere('source_slug', 'like', "%{$search}%")
                ->orWhere('thumbnail_prompt', 'like', "%{$search}%")
                ->orWhere('error_message', 'like', "%{$search}%");
        });
    }

    /**
     * @param  Builder<Prompt>  $query
     * @return Builder<Prompt>
     */
    public function scopeWithStatus(Builder $query, ?string $status): Builder
    {
        return in_array($status, self::STATUSES, true)
            ? $query->where('status', $status)
            : $query;
    }

    /**
     * @param  Builder<Prompt>  $query
     * @return Builder<Prompt>
     */
    public function scopeWithCategory(Builder $query, ?string $category): Builder
    {
        return in_array($category, self::CATEGORIES, true)
            ? $query->where('category', $category)
            : $query;
    }

    /**
     * @param  Builder<Prompt>  $query
     * @return Builder<Prompt>
     */
    public function scopeWithGenerationMode(Builder $query, ?string $generationMode): Builder
    {
        return in_array($generationMode, self::GENERATION_MODES, true)
            ? $query->where('generation_mode', $generationMode)
            : $query;
    }

    /**
     * @param  Builder<Prompt>  $query
     * @return Builder<Prompt>
     */
    public function scopeWithSourceSite(Builder $query, ?string $sourceSite): Builder
    {
        return match ($sourceSite) {
            'promptplum' => $query->where('source_site', 'promptplum'),
            'local' => $query->whereNull('source_site'),
            default => $query,
        };
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
            'variation_variables' => 'array',
            'is_template' => 'boolean',
            'image_rights_verified_at' => 'datetime',
            'copy_count' => 'integer',
            'source_published_at' => 'datetime',
            'source_modified_at' => 'datetime',
            'reviewed_at' => 'datetime',
            'generated_at' => 'datetime',
        ];
    }
}
