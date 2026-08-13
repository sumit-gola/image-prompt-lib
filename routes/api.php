<?php

use App\Http\Controllers\Api\PromptController;
use Illuminate\Support\Facades\Route;

Route::get('prompts', PromptController::class)->name('api.prompts.index');
