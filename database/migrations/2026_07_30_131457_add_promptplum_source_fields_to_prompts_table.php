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
            $table->string('source_site', 64)->nullable()->after('source_idea');
            $table->string('source_slug')->nullable()->after('source_site');
            $table->string('source_url', 2048)->nullable()->after('source_slug');
            $table->string('source_thumbnail_url', 2048)->nullable()->after('source_url');
            $table->timestamp('source_published_at')->nullable()->after('source_thumbnail_url');
            $table->timestamp('source_modified_at')->nullable()->after('source_published_at');

            $table->unique(['source_site', 'source_slug'], 'prompts_source_site_slug_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('prompts', function (Blueprint $table) {
            $table->dropUnique('prompts_source_site_slug_unique');
            $table->dropColumn([
                'source_site',
                'source_slug',
                'source_url',
                'source_thumbnail_url',
                'source_published_at',
                'source_modified_at',
            ]);
        });
    }
};
