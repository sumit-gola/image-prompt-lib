<?php

use App\Http\Controllers\AdminPromptController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\PromptController;
use Illuminate\Support\Facades\Route;

Route::get('/', [PromptController::class, 'home'])->name('home');

Route::get('prompts', [PromptController::class, 'index'])->name('prompts.index');
Route::get('prompts/{prompt}', [PromptController::class, 'show'])->name('prompts.show');
Route::post('prompts/{prompt}/copy', [PromptController::class, 'copy'])
    ->middleware('throttle:prompt-copy')
    ->name('prompts.copy');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');

    Route::prefix('admin')->name('admin.')->group(function () {
        Route::get('prompts', [AdminPromptController::class, 'index'])->name('prompts.index');
        Route::post('prompts', [AdminPromptController::class, 'store'])->name('prompts.store');
        Route::post('prompts/auto', [AdminPromptController::class, 'storeAuto'])->name('prompts.store-auto');
        Route::patch('prompts/bulk', [AdminPromptController::class, 'bulk'])->name('prompts.bulk');
        Route::get('prompts/{prompt}/edit', [AdminPromptController::class, 'edit'])->name('prompts.edit');
        Route::patch('prompts/{prompt}', [AdminPromptController::class, 'update'])->name('prompts.update');
        Route::post('prompts/{prompt}/regenerate', [AdminPromptController::class, 'regenerate'])->name('prompts.regenerate');
        Route::delete('prompts/{prompt}', [AdminPromptController::class, 'destroy'])->name('prompts.destroy');
    });
});

require __DIR__.'/settings.php';
