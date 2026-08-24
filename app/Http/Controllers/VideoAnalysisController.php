<?php

namespace App\Http\Controllers;

use App\Http\Requests\RegenerateVideoPromptRequest;
use App\Http\Requests\StoreVideoAnalysisRequest;
use App\Jobs\AnalyzeVideoJob;
use App\Models\VideoAnalysis;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class VideoAnalysisController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('video-to-prompt/index', ['analyses' => auth()->user()->videoAnalyses()->latest()->get()]);
    }

    public function store(StoreVideoAnalysisRequest $request): RedirectResponse
    {
        $video = $request->file('video');
        $path = $video->store('video-analyses/'.(string) $request->user()->id, config('video-analysis.disk'));
        $analysis = $request->user()->videoAnalyses()->create([
            'original_filename' => $video->getClientOriginalName(), 'video_path' => $path, 'mime_type' => $video->getMimeType() ?: 'application/octet-stream',
            'size' => $video->getSize(), 'status' => VideoAnalysis::STATUS_QUEUED, 'progress' => 0, 'status_message' => 'Waiting to be processed',
            'customization' => $request->validated('customization'),
        ]);
        AnalyzeVideoJob::dispatch($analysis);

        return to_route('video-analyses.show', $analysis);
    }

    public function show(VideoAnalysis $videoAnalysis): Response
    {
        Gate::authorize('view', $videoAnalysis);

        return Inertia::render('video-to-prompt/show', ['analysis' => $videoAnalysis]);
    }

    public function regenerate(RegenerateVideoPromptRequest $request, VideoAnalysis $videoAnalysis): RedirectResponse
    {
        $videoAnalysis->update(['customization' => $request->validated('customization'), 'status' => VideoAnalysis::STATUS_QUEUED, 'progress' => 0, 'error_message' => null]);
        AnalyzeVideoJob::dispatch($videoAnalysis);

        return back();
    }

    public function destroy(VideoAnalysis $videoAnalysis): RedirectResponse
    {
        Gate::authorize('delete', $videoAnalysis);
        Storage::disk(config('video-analysis.disk'))->delete($videoAnalysis->video_path);
        $videoAnalysis->delete();

        return to_route('video-analyses.index');
    }
}
