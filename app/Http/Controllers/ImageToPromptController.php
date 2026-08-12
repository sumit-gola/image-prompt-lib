<?php

namespace App\Http\Controllers;

use App\Actions\Prompts\GeneratePromptFromUploadedImage;
use App\Actions\Prompts\ResolvePromptLibraryAiConfiguration;
use App\Http\Requests\GenerateImagePromptRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class ImageToPromptController extends Controller
{
    public function index(ResolvePromptLibraryAiConfiguration $aiConfiguration): Response
    {
        return Inertia::render('image-to-prompt/index', [
            'aiConfiguration' => $aiConfiguration->handle(),
            'generatedPrompt' => session('image_to_prompt.generated'),
        ]);
    }

    public function store(
        GenerateImagePromptRequest $request,
        GeneratePromptFromUploadedImage $generatePrompt,
    ): RedirectResponse {
        $image = $request->file('image');

        if (! $image instanceof UploadedFile) {
            throw ValidationException::withMessages([
                'image' => 'Please choose a supported image.',
            ]);
        }

        try {
            $result = $generatePrompt->handle($image);
        } catch (Throwable $exception) {
            report($exception);

            throw ValidationException::withMessages([
                'image' => $exception->getMessage(),
            ]);
        }

        return to_route('image-to-prompt.index')
            ->with('image_to_prompt.generated', $result);
    }
}
