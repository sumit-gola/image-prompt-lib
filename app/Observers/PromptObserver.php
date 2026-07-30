<?php

namespace App\Observers;

use App\Models\Prompt;
use App\Support\PromptSeo;
use Illuminate\Support\Facades\Cache;

class PromptObserver
{
    /**
     * Handle the Prompt "created" event.
     */
    public function created(Prompt $prompt): void
    {
        $this->forgetPublicSeoCaches();
    }

    /**
     * Handle the Prompt "updated" event.
     */
    public function updated(Prompt $prompt): void
    {
        $this->forgetPublicSeoCaches();
    }

    /**
     * Handle the Prompt "deleted" event.
     */
    public function deleted(Prompt $prompt): void
    {
        $this->forgetPublicSeoCaches();
    }

    /**
     * Handle the Prompt "restored" event.
     */
    public function restored(Prompt $prompt): void
    {
        $this->forgetPublicSeoCaches();
    }

    /**
     * Handle the Prompt "force deleted" event.
     */
    public function forceDeleted(Prompt $prompt): void
    {
        $this->forgetPublicSeoCaches();
    }

    private function forgetPublicSeoCaches(): void
    {
        Cache::forget(PromptSeo::SITEMAP_CACHE_KEY);
    }
}
