<?php

namespace App\Services\Video;

use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Symfony\Component\Process\Process;

class VideoFrameExtractor
{
    /** @return array{metadata: array<string, mixed>, frames: array<int, string>} */
    public function extract(string $storagePath): array
    {
        $videoPath = Storage::disk(config('video-analysis.disk'))->path($storagePath);
        $probe = new Process([config('video-analysis.ffprobe'), '-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', $videoPath]);
        $probe->mustRun();
        $metadata = json_decode($probe->getOutput(), true, flags: JSON_THROW_ON_ERROR);
        $duration = max(1.0, (float) data_get($metadata, 'format.duration', 1));
        $directory = storage_path('app/private/video-analysis-frames/'.pathinfo($storagePath, PATHINFO_FILENAME));
        if (! is_dir($directory) && ! mkdir($directory, 0755, true) && ! is_dir($directory)) {
            throw new RuntimeException('Unable to create the temporary frame directory.');
        }

        $frames = [];
        $count = max(3, (int) config('video-analysis.frame_count'));
        for ($index = 0; $index < $count; $index++) {
            $frame = $directory.'/frame-'.str_pad((string) $index, 2, '0', STR_PAD_LEFT).'.jpg';
            $timestamp = ($duration * ($index + 0.5)) / $count;
            (new Process([config('video-analysis.ffmpeg'), '-y', '-ss', (string) $timestamp, '-i', $videoPath, '-frames:v', '1', '-vf', 'scale=1280:-2', '-q:v', '3', $frame]))->setTimeout(120)->mustRun();
            $frames[] = $frame;
        }

        return ['metadata' => $metadata, 'frames' => $frames];
    }

    /** @param array<int, string> $frames */
    public function cleanup(array $frames): void
    {
        foreach ($frames as $frame) {
            if (is_file($frame)) {
                unlink($frame);
            }
        }
        if (isset($frames[0])) {
            @rmdir(dirname($frames[0]));
        }
    }
}
