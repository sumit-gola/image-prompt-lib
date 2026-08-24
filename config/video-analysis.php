<?php

$homebrewPrefix = PHP_OS_FAMILY === 'Darwin' && is_dir('/opt/homebrew/bin') ? '/opt/homebrew/bin/' : '';

return [
    'disk' => env('VIDEO_ANALYSIS_DISK', 'local'),
    'max_upload_kb' => (int) env('VIDEO_ANALYSIS_MAX_UPLOAD_KB', 102400),
    'frame_count' => (int) env('VIDEO_ANALYSIS_FRAME_COUNT', 8),
    'ffmpeg' => env('FFMPEG_BINARY', $homebrewPrefix.'ffmpeg'),
    'ffprobe' => env('FFPROBE_BINARY', $homebrewPrefix.'ffprobe'),
];
