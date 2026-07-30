<?php

namespace App\Actions\Prompts;

use App\Models\Prompt;
use Illuminate\Database\Eloquent\Builder;

class BuildPromptStatusSummary
{
    /**
     * @param  Builder<Prompt>|null  $query
     * @return array{total: int, pending: int, processing: int, completed: int, failed: int, imported: int, auto: int, reference_image: int, total_copies: int, latest_generated_at: string|null, failed_needing_attention: int}
     */
    public function handle(?Builder $query = null): array
    {
        $query ??= Prompt::query();

        $statusCounts = (clone $query)
            ->select('status')
            ->selectRaw('count(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status')
            ->map(fn (mixed $count): int => (int) $count);

        $modeCounts = (clone $query)
            ->select('generation_mode')
            ->selectRaw('count(*) as aggregate')
            ->groupBy('generation_mode')
            ->pluck('aggregate', 'generation_mode')
            ->map(fn (mixed $count): int => (int) $count);

        $latestGeneratedPrompt = (clone $query)
            ->whereNotNull('generated_at')
            ->latest('generated_at')
            ->first(['id', 'generated_at']);

        return [
            'total' => (int) $statusCounts->sum(),
            'pending' => (int) $statusCounts->get(Prompt::STATUS_PENDING, 0),
            'processing' => (int) $statusCounts->get(Prompt::STATUS_PROCESSING, 0),
            'completed' => (int) $statusCounts->get(Prompt::STATUS_COMPLETED, 0),
            'failed' => (int) $statusCounts->get(Prompt::STATUS_FAILED, 0),
            'imported' => (int) $modeCounts->get(Prompt::GENERATION_MODE_IMPORTED, 0),
            'auto' => (int) $modeCounts->get(Prompt::GENERATION_MODE_AUTO, 0),
            'reference_image' => (int) $modeCounts->get(Prompt::GENERATION_MODE_REFERENCE_IMAGE, 0),
            'total_copies' => (int) (clone $query)->sum('copy_count'),
            'latest_generated_at' => $latestGeneratedPrompt?->generated_at instanceof \DateTimeInterface
                ? $latestGeneratedPrompt->generated_at->format(DATE_ATOM)
                : null,
            'failed_needing_attention' => (int) (clone $query)
                ->where('status', Prompt::STATUS_FAILED)
                ->count(),
        ];
    }
}
