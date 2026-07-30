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
            $table->index(['status', 'generated_at', 'id'], 'prompts_public_newest_index');
            $table->index(['status', 'copy_count', 'generated_at', 'id'], 'prompts_public_popular_index');
            $table->index(['status', 'category', 'generated_at', 'id'], 'prompts_public_category_index');
            $table->index(['status', 'created_at', 'id'], 'prompts_admin_status_index');
            $table->index(['generation_mode', 'created_at', 'id'], 'prompts_admin_mode_index');
            $table->index(['source_site', 'created_at', 'id'], 'prompts_admin_source_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('prompts', function (Blueprint $table) {
            $table->dropIndex('prompts_public_newest_index');
            $table->dropIndex('prompts_public_popular_index');
            $table->dropIndex('prompts_public_category_index');
            $table->dropIndex('prompts_admin_status_index');
            $table->dropIndex('prompts_admin_mode_index');
            $table->dropIndex('prompts_admin_source_index');
        });
    }
};
