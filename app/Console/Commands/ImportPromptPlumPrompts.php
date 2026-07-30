<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\PromptPlum\PromptPlumImporter;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('prompts:import-promptplum
    {--limit= : Maximum number of prompt detail pages to import}
    {--user= : User ID or email that should own imported prompts}
    {--delay=500 : Delay between fetched prompt pages in milliseconds}
    {--dry-run : Fetch and parse without saving prompts or thumbnails}
    {--force : Update existing PromptPlum prompts instead of skipping them}')]
#[Description('Import public PromptPlum prompt pages into the local prompt library')]
class ImportPromptPlumPrompts extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(PromptPlumImporter $importer): int
    {
        $limit = $this->positiveIntegerOption('limit');
        $delayMs = $this->nonNegativeIntegerOption('delay', 500);
        $user = $this->resolveUser($this->stringOption('user'));

        if ($user === null) {
            $this->error('No user was found to own imported prompts. Create an admin user or pass --user.');

            return self::FAILURE;
        }

        if ($limit === false || $delayMs === false) {
            return self::FAILURE;
        }

        $this->info('Importing PromptPlum prompts from public sitemap pages...');

        $stats = $importer->import(
            user: $user,
            limit: $limit,
            dryRun: (bool) $this->option('dry-run'),
            delayMs: $delayMs,
            force: (bool) $this->option('force'),
        );

        $this->table(
            ['Total', 'Processed', 'Created', 'Updated', 'Skipped', 'Failed'],
            [[
                $stats['total'],
                $stats['processed'],
                $stats['created'],
                $stats['updated'],
                $stats['skipped'],
                $stats['failed'],
            ]],
        );

        foreach (array_slice($stats['failures'], 0, 10) as $failure) {
            $this->warn($failure['url'].': '.$failure['error']);
        }

        if (count($stats['failures']) > 10) {
            $this->warn((count($stats['failures']) - 10).' more failures omitted from output.');
        }

        return $stats['failed'] > 0 ? self::FAILURE : self::SUCCESS;
    }

    private function resolveUser(?string $value): ?User
    {
        if ($value !== null) {
            return ctype_digit($value)
                ? User::query()->find((int) $value)
                : User::query()->where('email', $value)->first();
        }

        return User::query()->where('is_admin', true)->first()
            ?? User::query()->first();
    }

    private function stringOption(string $key): ?string
    {
        $value = $this->option($key);

        return is_string($value) && trim($value) !== '' ? trim($value) : null;
    }

    private function positiveIntegerOption(string $key): int|false|null
    {
        $value = $this->stringOption($key);

        if ($value === null) {
            return null;
        }

        if (! ctype_digit($value) || (int) $value < 1) {
            $this->error("--{$key} must be a positive integer.");

            return false;
        }

        return (int) $value;
    }

    private function nonNegativeIntegerOption(string $key, int $default): int|false
    {
        $value = $this->stringOption($key);

        if ($value === null) {
            return $default;
        }

        if (! ctype_digit($value)) {
            $this->error("--{$key} must be a non-negative integer.");

            return false;
        }

        return (int) $value;
    }
}
