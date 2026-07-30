<?php

namespace App\Http\Controllers;

use App\Models\Prompt;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class PromptController extends Controller
{
    public function index(Request $request): Response
    {
        $search = trim((string) $request->string('search'));
        $category = (string) $request->string('category');
        $category = in_array($category, Prompt::CATEGORIES, true) ? $category : null;

        $prompts = Prompt::query()
            ->completed()
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($query) use ($search): void {
                    $query->where('title', 'like', "%{$search}%")
                        ->orWhere('prompt', 'like', "%{$search}%");
                });
            })
            ->when($category !== null, fn ($query) => $query->where('category', $category))
            ->latest('generated_at')
            ->latest()
            ->paginate(12)
            ->withQueryString()
            ->through(fn (Prompt $prompt): array => $this->promptData($prompt));

        return Inertia::render('prompts/index', [
            'prompts' => $prompts,
            'categories' => Prompt::CATEGORIES,
            'filters' => [
                'search' => $search,
                'category' => $category,
            ],
        ]);
    }

    public function show(Prompt $prompt): Response
    {
        abort_unless($prompt->status === Prompt::STATUS_COMPLETED, 404);

        return Inertia::render('prompts/show', [
            'promptItem' => $this->promptData($prompt),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    protected function promptData(Prompt $prompt): array
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
            'generated_at' => $prompt->generated_at?->toIso8601String(),
            'created_at' => $prompt->created_at?->toIso8601String(),
        ];
    }
}
