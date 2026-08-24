<?php

use App\Jobs\AnalyzeVideoJob;
use App\Models\User;
use App\Models\VideoAnalysis;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

test('guests cannot access video analyses', function (): void {
    $this->get('/video-analyses')->assertRedirect('/login');
});

test('users can upload a private video for queued analysis', function (): void {
    Storage::fake('local');
    Queue::fake();
    $user = User::factory()->create();
    $video = UploadedFile::fake()->create('cinematic.mp4', 1200, 'video/mp4');

    $this->actingAs($user)->post('/video-analyses', ['video' => $video, 'customization' => 'Replace the subject with an astronaut.'])->assertRedirect();

    $analysis = VideoAnalysis::query()->sole();
    expect($analysis->user_id)->toBe($user->id)->and($analysis->customization)->toBe('Replace the subject with an astronaut.')->and($analysis->status)->toBe(VideoAnalysis::STATUS_QUEUED);
    Storage::disk('local')->assertExists($analysis->video_path);
    Queue::assertPushed(AnalyzeVideoJob::class, fn (AnalyzeVideoJob $job): bool => $job->videoAnalysis->is($analysis));
});

test('video uploads reject unsupported files', function (): void {
    $this->actingAs(User::factory()->create())->post('/video-analyses', ['video' => UploadedFile::fake()->create('notes.txt', 10, 'text/plain')])->assertSessionHasErrors('video');
});

test('users cannot view another users analysis', function (): void {
    $analysis = VideoAnalysis::factory()->create();
    $this->actingAs(User::factory()->create())->get(route('video-analyses.show', $analysis))->assertForbidden();
});

test('owners can delete an analysis and its private video', function (): void {
    Storage::fake('local');
    $analysis = VideoAnalysis::factory()->create();
    Storage::disk('local')->put($analysis->video_path, 'video');
    $this->actingAs($analysis->user)->delete(route('video-analyses.destroy', $analysis))->assertRedirect(route('video-analyses.index'));
    Storage::disk('local')->assertMissing($analysis->video_path);
    $this->assertModelMissing($analysis);
});

test('failed analysis hides internal process details from users', function (): void {
    $analysis = VideoAnalysis::factory()->create();

    (new AnalyzeVideoJob($analysis))->failed(new RuntimeException('secret command and internal path'));

    expect($analysis->refresh()->error_message)
        ->not->toContain('secret command')
        ->toContain('could not analyze');
});
