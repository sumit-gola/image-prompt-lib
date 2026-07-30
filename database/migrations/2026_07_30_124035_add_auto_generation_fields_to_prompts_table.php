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
        Schema::table('prompts', function (Blueprint $table) {
            $table->string('thumbnail_path')->nullable()->change();
            $table->string('reference_image_path')->nullable()->change();
            $table->string('generation_mode', 32)->default('reference_image')->after('user_id')->index();
            $table->text('source_idea')->nullable()->after('generation_mode');
            $table->longText('thumbnail_prompt')->nullable()->after('negative_prompt');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('prompts', function (Blueprint $table) {
            $table->dropColumn([
                'generation_mode',
                'source_idea',
                'thumbnail_prompt',
            ]);

            $table->string('thumbnail_path')->nullable(false)->change();
            $table->string('reference_image_path')->nullable(false)->change();
        });
    }
};
