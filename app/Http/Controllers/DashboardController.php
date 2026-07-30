<?php

namespace App\Http\Controllers;

use App\Actions\Prompts\BuildPromptStatusSummary;
use App\Models\Prompt;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request, BuildPromptStatusSummary $buildPromptStatusSummary): Response
    {
        $user = $request->user();

        abort_unless($user instanceof User, 403);

        $canManagePrompts = $user->can('create', Prompt::class);
        $promptQuery = Prompt::query()
            ->when(! $canManagePrompts, fn ($query) => $query->completed());

        return Inertia::render('dashboard', [
            'canManagePrompts' => $canManagePrompts,
            'promptSummary' => $buildPromptStatusSummary->handle($promptQuery),
            'recentPrompts' => (clone $promptQuery)
                ->latest()
                ->limit(6)
                ->get()
                ->map(fn (Prompt $prompt): array => $this->promptData($prompt))
                ->values(),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function promptData(Prompt $prompt): array
    {
        return [
            'id' => $prompt->id,
            'title' => $prompt->title,
            'thumbnail_url' => $prompt->thumbnail_path === null
                ? null
                : Storage::disk('public')->url($prompt->thumbnail_path),
            'category' => $prompt->category,
            'status' => $prompt->status,
            'error_message' => $prompt->error_message,
            'generated_at' => $prompt->generated_at?->toIso8601String(),
            'created_at' => $prompt->created_at?->toIso8601String(),
        ];
    }
}
