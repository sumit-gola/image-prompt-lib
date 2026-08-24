<?php

namespace App\Jobs;

use App\Actions\Prompts\ResolvePromptLibraryAiConfiguration;
use App\Ai\Agents\VideoCinematicAnalyzer;
use App\Models\VideoAnalysis;
use App\Services\Video\VideoFrameExtractor;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Laravel\Ai\Files\Image;
use Laravel\Ai\Responses\StructuredAgentResponse;
use RuntimeException;
use Throwable;

class AnalyzeVideoJob implements ShouldBeUnique, ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $timeout = 600;

    public array $backoff = [30, 120, 300];

    public function __construct(public VideoAnalysis $videoAnalysis) {}

    public function uniqueId(): string
    {
        return (string) $this->videoAnalysis->id;
    }

    /**
     * Execute the job.
     */
    public function handle(VideoFrameExtractor $extractor, ResolvePromptLibraryAiConfiguration $configuration): void
    {
        $frames = [];
        $this->videoAnalysis->update(['status' => VideoAnalysis::STATUS_PROCESSING, 'progress' => 10, 'status_message' => 'Extracting representative frames', 'error_message' => null]);
        try {
            $result = $extractor->extract($this->videoAnalysis->video_path);
            $frames = $result['frames'];
            $this->videoAnalysis->update(['metadata' => $result['metadata'], 'progress' => 45, 'status_message' => 'Analyzing cinematography']);
            $ai = $configuration->handle();
            if (! $ai['is_configured']) {
                throw new RuntimeException($ai['message'] ?? 'AI provider is not configured.');
            }
            $response = (new VideoCinematicAnalyzer)->prompt(
                'Analyze these frames in chronological order. User changes: '.($this->videoAnalysis->customization ?: 'none'),
                attachments: array_map(fn (string $frame): Image => Image::fromPath($frame), $frames),
                provider: $ai['provider'], model: $ai['model'], timeout: max(180, $ai['timeout']),
            );
            if (! $response instanceof StructuredAgentResponse) {
                throw new RuntimeException('The cinematic analysis was not structured.');
            }
            $data = $response->toArray();
            $this->videoAnalysis->update([
                'analysis' => ['summary' => $data['summary'], 'scenes' => $data['scenes'], 'confidence_notes' => $data['confidence_notes']],
                'master_prompt' => $data['master_prompt'], 'shot_by_shot_prompt' => $data['shot_by_shot_prompt'], 'technical_prompt' => $data['technical_prompt'],
                'negative_prompt' => $data['negative_prompt'], 'condensed_prompt' => $data['condensed_prompt'], 'status' => VideoAnalysis::STATUS_COMPLETED,
                'progress' => 100, 'status_message' => 'Analysis complete', 'completed_at' => now(),
            ]);
        } catch (Throwable $exception) {
            $this->markFailed($exception);
            throw $exception;
        } finally {
            $extractor->cleanup($frames);
        }
    }

    public function failed(?Throwable $exception): void
    {
        $this->markFailed($exception);
    }

    private function markFailed(?Throwable $exception): void
    {
        if ($exception !== null) {
            report($exception);
        }

        $this->videoAnalysis->update([
            'status' => VideoAnalysis::STATUS_FAILED,
            'status_message' => 'Analysis failed',
            'error_message' => 'We could not analyze this video. Confirm that FFmpeg is available, then retry. If the problem continues, check the application log.',
        ]);
    }
}
