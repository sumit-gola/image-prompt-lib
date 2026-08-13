<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('prompts')
            ->select('id')
            ->whereNull('prompt_id')
            ->chunkById(500, function ($prompts): void {
                foreach ($prompts as $prompt) {
                    DB::table('prompts')
                        ->where('id', $prompt->id)
                        ->update(['prompt_id' => (string) Str::uuid7()]);
                }
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // The generated identifiers are intentionally retained on rollback.
    }
};
