<?php

namespace App\Http\Controllers\Api;

use App\Actions\Prompts\ReplacePromptThumbnail;
use App\Http\Controllers\Controller;
use App\Http\Requests\UpdatePromptThumbnailRequest;
use App\Http\Resources\PromptResource;
use App\Models\Prompt;
use Illuminate\Http\UploadedFile;

class PromptThumbnailController extends Controller
{
    public function __invoke(
        UpdatePromptThumbnailRequest $request,
        Prompt $prompt,
        ReplacePromptThumbnail $replacePromptThumbnail,
    ): PromptResource {
        $thumbnail = $request->file('thumbnail');

        abort_unless($thumbnail instanceof UploadedFile, 422);

        return new PromptResource($replacePromptThumbnail->handle($prompt, $thumbnail));
    }
}
