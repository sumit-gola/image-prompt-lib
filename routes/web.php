<?php

use App\Http\Controllers\AdminPromptController;
use App\Http\Controllers\PromptController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::get('prompts', [PromptController::class, 'index'])->name('prompts.index');
Route::get('prompts/{prompt}', [PromptController::class, 'show'])->name('prompts.show');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    Route::prefix('admin')->name('admin.')->group(function () {
        Route::get('prompts', [AdminPromptController::class, 'index'])->name('prompts.index');
        Route::post('prompts', [AdminPromptController::class, 'store'])->name('prompts.store');
        Route::delete('prompts/{prompt}', [AdminPromptController::class, 'destroy'])->name('prompts.destroy');
    });
});

require __DIR__.'/settings.php';
