<?php

use App\Http\Controllers\Api\PromptController;
use App\Http\Controllers\Api\PromptThumbnailController;
use Illuminate\Support\Facades\Route;

Route::get('prompts', PromptController::class)->name('api.prompts.index');

Route::post('prompts/{prompt}/thumbnail', PromptThumbnailController::class)
    ->middleware(['web', 'auth', 'verified', 'throttle:10,1'])
    ->name('api.prompts.thumbnail.update');
