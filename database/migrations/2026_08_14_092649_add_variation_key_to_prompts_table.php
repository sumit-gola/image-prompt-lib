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
        if (! Schema::hasColumn('prompts', 'is_template')) {
            Schema::table('prompts', function (Blueprint $table) {
                $table->boolean('is_template')->default(false)->after('status');
            });
        }

        if (! Schema::hasColumn('prompts', 'base_prompt_id')) {
            Schema::table('prompts', function (Blueprint $table) {
                $table->foreignId('base_prompt_id')->nullable()->after('user_id')->constrained('prompts')->nullOnDelete();
            });
        }

        if (! Schema::hasColumn('prompts', 'variation_preset')) {
            Schema::table('prompts', function (Blueprint $table) {
                $table->string('variation_preset')->nullable()->after('base_prompt_id');
            });
        }

        if (! Schema::hasColumn('prompts', 'variation_variables')) {
            Schema::table('prompts', function (Blueprint $table) {
                $table->json('variation_variables')->nullable()->after('variation_preset');
            });
        }

        if (! Schema::hasColumn('prompts', 'image_rights_status')) {
            Schema::table('prompts', function (Blueprint $table) {
                $table->string('image_rights_status', 24)->default('unverified')->after('reference_image_path');
                $table->text('image_rights_basis')->nullable()->after('image_rights_status');
                $table->text('image_rights_evidence')->nullable()->after('image_rights_basis');
            });
        }

        if (! Schema::hasColumn('prompts', 'image_rights_verified_at')) {
            Schema::table('prompts', function (Blueprint $table) {
                $table->timestamp('image_rights_verified_at')->nullable()->after('image_rights_evidence');
            });
        }

        Schema::table('prompts', function (Blueprint $table) {
            $table->string('variation_key', 64)->nullable()->after('variation_preset');
            $table->unique(['base_prompt_id', 'variation_preset', 'variation_key'], 'prompts_unique_variant');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('prompts', function (Blueprint $table) {
            $table->dropUnique('prompts_unique_variant');
            $table->dropColumn('variation_key');
        });
    }
};
