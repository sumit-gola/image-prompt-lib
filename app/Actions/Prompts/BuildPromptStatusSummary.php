<?php

namespace App\Actions\Prompts;

use App\Models\Prompt;
use Illuminate\Database\Eloquent\Builder;

class BuildPromptStatusSummary
{
    /**
     * @param  Builder<Prompt>|null  $query
     * @return array{total: int, pending: int, processing: int, completed: int, failed: int}
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

        return [
            'total' => (int) $statusCounts->sum(),
            'pending' => (int) $statusCounts->get(Prompt::STATUS_PENDING, 0),
            'processing' => (int) $statusCounts->get(Prompt::STATUS_PROCESSING, 0),
            'completed' => (int) $statusCounts->get(Prompt::STATUS_COMPLETED, 0),
            'failed' => (int) $statusCounts->get(Prompt::STATUS_FAILED, 0),
        ];
    }
}
