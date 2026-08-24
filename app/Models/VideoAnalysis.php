<?php

namespace App\Models;

use Database\Factories\VideoAnalysisFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'original_filename', 'video_path', 'mime_type', 'size', 'status', 'progress', 'status_message', 'customization', 'metadata', 'analysis', 'master_prompt', 'shot_by_shot_prompt', 'technical_prompt', 'negative_prompt', 'condensed_prompt', 'error_message', 'completed_at'])]
class VideoAnalysis extends Model
{
    public const STATUS_QUEUED = 'queued';

    public const STATUS_PROCESSING = 'processing';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_FAILED = 'failed';

    /** @use HasFactory<VideoAnalysisFactory> */
    use HasFactory;

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    protected function casts(): array
    {
        return ['metadata' => 'array', 'analysis' => 'array', 'completed_at' => 'datetime'];
    }
}
