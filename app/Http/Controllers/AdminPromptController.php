<?php

namespace App\Http\Controllers;

use App\Actions\Prompts\StorePromptReferenceImages;
use App\Http\Requests\StorePromptReferenceImagesRequest;
use App\Models\Prompt;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class AdminPromptController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('create', Prompt::class);

        $search = trim((string) $request->string('search'));
        $status = (string) $request->string('status');
        $status = in_array($status, [
            Prompt::STATUS_PENDING,
            Prompt::STATUS_PROCESSING,
            Prompt::STATUS_COMPLETED,
            Prompt::STATUS_FAILED,
        ], true) ? $status : null;

        $prompts = Prompt::query()
            ->with('user:id,name,email')
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($query) use ($search): void {
                    $query->where('title', 'like', "%{$search}%")
                        ->orWhere('prompt', 'like', "%{$search}%")
                        ->orWhere('error_message', 'like', "%{$search}%");
                });
            })
            ->when($status !== null, fn ($query) => $query->where('status', $status))
            ->latest()
            ->paginate(24)
            ->withQueryString()
            ->through(fn (Prompt $prompt): array => $this->adminPromptData($prompt));

        return Inertia::render('admin/prompts/index', [
            'prompts' => $prompts,
            'statuses' => [
                Prompt::STATUS_PENDING,
                Prompt::STATUS_PROCESSING,
                Prompt::STATUS_COMPLETED,
                Prompt::STATUS_FAILED,
            ],
            'filters' => [
                'search' => $search,
                'status' => $status,
            ],
            'requiresPolling' => Prompt::query()
                ->whereIn('status', [Prompt::STATUS_PENDING, Prompt::STATUS_PROCESSING])
                ->exists(),
        ]);
    }

    public function store(StorePromptReferenceImagesRequest $request, StorePromptReferenceImages $store): RedirectResponse
    {
        $user = $request->user();

        abort_unless($user instanceof User, 403);

        $prompts = $store->handle($user, $request->file('images', []));

        return redirect()
            ->route('admin.prompts.index')
            ->with('success', $prompts->count().' reference image'.($prompts->count() === 1 ? '' : 's').' queued for prompt generation.');
    }

    public function destroy(Prompt $prompt): RedirectResponse
    {
        Gate::authorize('delete', $prompt);

        Storage::disk('public')->delete([
            $prompt->reference_image_path,
            $prompt->thumbnail_path,
        ]);

        $prompt->delete();

        return back()->with('success', 'Prompt deleted.');
    }

    /**
     * @return array<string, mixed>
     */
    protected function adminPromptData(Prompt $prompt): array
    {
        return [
            'id' => $prompt->id,
            'title' => $prompt->title,
            'prompt' => $prompt->prompt,
            'negative_prompt' => $prompt->negative_prompt,
            'thumbnail_url' => Storage::disk('public')->url($prompt->thumbnail_path),
            'reference_image_url' => Storage::disk('public')->url($prompt->reference_image_path),
            'category' => $prompt->category,
            'style_notes' => $prompt->style_notes,
            'status' => $prompt->status,
            'error_message' => $prompt->error_message,
            'ai_provider' => $prompt->ai_provider,
            'ai_model' => $prompt->ai_model,
            'generated_at' => $prompt->generated_at?->toIso8601String(),
            'created_at' => $prompt->created_at?->toIso8601String(),
            'user' => $prompt->user === null ? null : [
                'id' => $prompt->user->id,
                'name' => $prompt->user->name,
                'email' => $prompt->user->email,
            ],
        ];
    }
}
