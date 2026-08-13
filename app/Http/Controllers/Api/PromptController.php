<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PromptResource;
use App\Models\Prompt;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PromptController extends Controller
{
    public function __invoke(): AnonymousResourceCollection
    {
        $prompts = Prompt::query()
            ->select(['id', 'prompt', 'title', 'thumbnail_path', 'generated_at'])
            ->completed()
            ->latest('generated_at')
            ->latest('id')
            ->paginate(15);

        return PromptResource::collection($prompts);
    }
}
