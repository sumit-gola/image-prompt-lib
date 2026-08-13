<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Prompts\PushPromptToLive;
use App\Http\Controllers\Controller;
use App\Models\Prompt;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Throwable;

class PushPromptToLiveController extends Controller
{
    public function __invoke(Prompt $prompt, PushPromptToLive $pushPromptToLive): RedirectResponse
    {
        Gate::authorize('update', $prompt);

        try {
            $pushPromptToLive->handle($prompt);
        } catch (Throwable $exception) {
            report($exception);

            return back()->withErrors([
                'push_live' => $exception->getMessage(),
            ]);
        }

        return back()->with('success', 'Prompt pushed to the live library.');
    }
}
