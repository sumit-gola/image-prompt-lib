<?php

namespace App\Providers;

use App\Models\Prompt;
use App\Models\VideoAnalysis;
use App\Observers\PromptObserver;
use App\Policies\PromptPolicy;
use App\Policies\VideoAnalysisPolicy;
use Carbon\CarbonImmutable;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::policy(Prompt::class, PromptPolicy::class);
        Gate::policy(VideoAnalysis::class, VideoAnalysisPolicy::class);
        Prompt::observe(PromptObserver::class);

        $this->configureDefaults();
        $this->configureRateLimiters();
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }

    /**
     * Configure application-specific route rate limiters.
     */
    protected function configureRateLimiters(): void
    {
        RateLimiter::for('prompt-copy', function (Request $request) {
            return Limit::perMinute(30)->by($request->ip());
        });
    }
}
