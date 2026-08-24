<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('video_analyses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('original_filename');
            $table->string('video_path');
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('size');
            $table->string('status', 30)->default('queued')->index();
            $table->unsignedTinyInteger('progress')->default(0);
            $table->string('status_message')->nullable();
            $table->text('customization')->nullable();
            $table->json('metadata')->nullable();
            $table->json('analysis')->nullable();
            $table->longText('master_prompt')->nullable();
            $table->longText('shot_by_shot_prompt')->nullable();
            $table->longText('technical_prompt')->nullable();
            $table->longText('negative_prompt')->nullable();
            $table->longText('condensed_prompt')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('video_analyses');
    }
};
