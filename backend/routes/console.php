<?php

use App\Services\DatabaseAdminService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('sari:reset-db {--mode=clean_slate : Reset mode: clean_slate, demo_seed, keep_categories, or fresh} {--force : Bypass interactive confirmation}', function (DatabaseAdminService $service) {
    $mode = (string) ($this->option('mode') ?: 'clean_slate');

    if (!$this->option('force') && !$this->confirm('⚠️  Are you sure you want to reset the database? This is irreversible.')) {
        $this->warn('Database reset cancelled.');
        return 1;
    }

    if ($mode === 'fresh') {
        $this->info('Running migrate:fresh...');
        Artisan::call('migrate:fresh', ['--force' => true]);
        $this->info('Database freshly migrated.');
        return 0;
    }

    $msg = $service->resetDatabase('confirm to reset my database', $mode);
    $this->info($msg);
    return 0;
})->purpose('Purge and reset store database');
