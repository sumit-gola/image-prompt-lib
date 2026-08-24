<?php

use App\Http\Controllers\Admin\PromptVariantController;
use App\Http\Controllers\Admin\PushPromptToLiveController;
use App\Http\Controllers\Admin\SocialPostController;
use App\Http\Controllers\AdminPromptController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ImageToPromptController;
use App\Http\Controllers\PromptController;
use App\Http\Controllers\PublicPageController;
use App\Http\Controllers\SeoController;
use App\Http\Controllers\VideoAnalysisController;
use Illuminate\Support\Facades\Route;

Route::get('robots.txt', [SeoController::class, 'robots'])->name('seo.robots');
Route::get('sitemap.xml', [SeoController::class, 'sitemap'])->name('seo.sitemap');
Route::get('ads.txt', [SeoController::class, 'adsTxt'])->name('seo.ads-txt');

Route::get('/', [PromptController::class, 'home'])->name('home');
Route::get('about', [PublicPageController::class, 'about'])->name('about');
Route::get('contact', [PublicPageController::class, 'contact'])->name('contact');
Route::get('privacy-policy', [PublicPageController::class, 'privacyPolicy'])->name('privacy-policy');
Route::get('terms', [PublicPageController::class, 'terms'])->name('terms');

Route::get('prompts', [PromptController::class, 'index'])->name('prompts.index');
Route::get('prompts/{prompt}', [PromptController::class, 'show'])->name('prompts.show');
Route::post('prompts/{prompt}/copy', [PromptController::class, 'copy'])
    ->middleware('throttle:prompt-copy')
    ->name('prompts.copy');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');
    Route::get('image-to-prompt', [ImageToPromptController::class, 'index'])->name('image-to-prompt.index');
    Route::post('image-to-prompt', [ImageToPromptController::class, 'store'])
        ->middleware('throttle:10,1')
        ->name('image-to-prompt.store');
    Route::resource('video-analyses', VideoAnalysisController::class)->only(['index', 'store', 'show', 'destroy']);
    Route::post('video-analyses/{videoAnalysis}/regenerate', [VideoAnalysisController::class, 'regenerate'])->name('video-analyses.regenerate');

    Route::prefix('admin')->name('admin.')->group(function () {
        Route::get('prompts', [AdminPromptController::class, 'index'])->name('prompts.index');
        Route::post('prompts', [AdminPromptController::class, 'store'])->name('prompts.store');
        Route::post('prompts/auto', [AdminPromptController::class, 'storeAuto'])->name('prompts.store-auto');
        Route::patch('prompts/bulk', [AdminPromptController::class, 'bulk'])->name('prompts.bulk');
        Route::get('prompts/{prompt}/edit', [AdminPromptController::class, 'edit'])->name('prompts.edit');
        Route::patch('prompts/{prompt}', [AdminPromptController::class, 'update'])->name('prompts.update');
        Route::post('prompts/{prompt}/regenerate', [AdminPromptController::class, 'regenerate'])->name('prompts.regenerate');
        Route::post('prompts/{prompt}/variants', [PromptVariantController::class, 'store'])
            ->middleware('throttle:5,1')
            ->name('prompts.variants.store');
        Route::post('prompts/{prompt}/variants/{variant}/regenerate', [PromptVariantController::class, 'regenerate'])
            ->middleware('throttle:10,1')
            ->name('prompts.variants.regenerate');
        Route::delete('prompts/{prompt}/variants/{variant}', [PromptVariantController::class, 'destroy'])
            ->name('prompts.variants.destroy');
        Route::post('prompts/{prompt}/push-live', PushPromptToLiveController::class)
            ->middleware('throttle:10,1')
            ->name('prompts.push-live');
        Route::post('prompts/{prompt}/thumbnail', [AdminPromptController::class, 'generateThumbnail'])
            ->middleware('throttle:10,1')
            ->name('prompts.thumbnail');
        Route::delete('prompts/{prompt}', [AdminPromptController::class, 'destroy'])->name('prompts.destroy');
        Route::post('social-posts/{socialPost}/retry', [SocialPostController::class, 'retry'])->name('social-posts.retry');
        Route::resource('social-posts', SocialPostController::class)->only(['index', 'store', 'update', 'destroy']);
    });
});

require __DIR__.'/settings.php';
