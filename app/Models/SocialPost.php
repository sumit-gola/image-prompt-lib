<?php

namespace App\Models;

use Database\Factories\SocialPostFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['prompt_id', 'user_id', 'platform', 'status', 'title', 'caption', 'hashtags', 'alt_text', 'remote_id', 'remote_url', 'error_message', 'published_at', 'last_synced_at'])]
class SocialPost extends Model
{
    /** @use HasFactory<SocialPostFactory> */
    use HasFactory;

    public const PLATFORMS = ['facebook', 'x', 'instagram', 'youtube', 'pinterest'];

    public function prompt(): BelongsTo
    {
        return $this->belongsTo(Prompt::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    protected function casts(): array
    {
        return ['hashtags' => 'array', 'published_at' => 'datetime', 'last_synced_at' => 'datetime'];
    }
}
