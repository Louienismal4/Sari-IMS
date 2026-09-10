<?php

namespace App\Services;

use App\Models\Installation;
use App\Models\Setting;
use App\Models\Store;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Schema;

class InstallationService
{
    public const CURRENT_VERSION = '1.0.0';

    public function __construct(
        protected IntegrationCredentialService $credentialService
    ) {}

    /**
     * Check whether the application is fully installed.
     */
    public function isInstalled(): bool
    {
        try {
            if (!Schema::hasTable('installations')) {
                return false;
            }

            return Installation::where('status', Installation::STATUS_COMPLETED)->exists();
        } catch (\Throwable $e) {
            return false;
        }
    }

    /**
     * Retrieve current installation and diagnostic status.
     */
    public function getStatus(): array
    {
        $dbStatus = $this->testDatabase();
        $redisStatus = $this->testRedis();

        $installed = false;
        $status = Installation::STATUS_PENDING;
        $hasAdmin = false;
        $store = null;
        $hasGemini = false;
        $maskedGemini = null;

        if ($dbStatus['connected']) {
            try {
                if (Schema::hasTable('installations')) {
                    $inst = Installation::latest('id')->first();
                    if ($inst) {
                        $status = $inst->status;
                        $installed = $inst->isCompleted();
                    }
                }

                if (Schema::hasTable('users')) {
                    $hasAdmin = User::exists();
                }

                if (Schema::hasTable('stores')) {
                    $store = Store::first();
                }

                if (Schema::hasTable('integration_credentials')) {
                    $hasGemini = $this->credentialService->exists('gemini', 'api_key');
                    $maskedGemini = $this->credentialService->getMasked('gemini', 'api_key');
                }
            } catch (\Throwable $e) {
                Log::warning('Error querying database state in InstallationService: ' . $e->getMessage());
            }
        }

        return [
            'installed' => $installed,
            'status' => $status,
            'version' => self::CURRENT_VERSION,
            'database' => $dbStatus,
            'redis' => $redisStatus,
            'storage_writable' => is_writable(storage_path('framework')),
            'has_admin' => $hasAdmin,
            'store' => $store,
            'has_gemini_key' => $hasGemini,
            'masked_gemini_key' => $maskedGemini,
        ];
    }

    /**
     * Test Database connectivity.
     */
    public function testDatabase(): array
    {
        try {
            DB::connection()->getPdo();
            return [
                'connected' => true,
                'driver' => DB::getDriverName(),
                'database' => DB::getDatabaseName(),
                'message' => 'Database connection successful.',
            ];
        } catch (\Throwable $e) {
            return [
                'connected' => false,
                'driver' => config('database.default'),
                'database' => config('database.connections.' . config('database.default') . '.database'),
                'message' => 'Database connection failed: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Test Redis connectivity.
     */
    public function testRedis(): array
    {
        try {
            if (extension_loaded('redis')) {
                Redis::connection()->ping();
                return [
                    'connected' => true,
                    'message' => 'Redis connection successful.',
                ];
            }

            // Fallback socket ping if phpredis is missing
            $host = config('database.redis.default.host', '127.0.0.1');
            $port = (int) config('database.redis.default.port', 6379);
            $fp = @fsockopen($host, $port, $errno, $errstr, 2);
            if ($fp) {
                fclose($fp);
                return [
                    'connected' => true,
                    'message' => 'Redis server is reachable via socket.',
                ];
            }

            return [
                'connected' => false,
                'message' => 'Redis connection failed.',
            ];
        } catch (\Throwable $e) {
            return [
                'connected' => false,
                'message' => 'Redis test error: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Atomically complete the setup flow.
     */
    public function completeInstallation(array $adminData, array $storeData, array $integrations = []): array
    {
        // 1. Prevent concurrent installation attempts
        $lockKey = 'sari_ims_installation_lock';
        $lock = Cache::lock($lockKey, 60);

        if (!$lock->get()) {
            throw new \RuntimeException('An installation is already in progress. Please wait.');
        }

        try {
            // 2. Prevent replay if already completed
            if ($this->isInstalled()) {
                throw new \RuntimeException('Installation has already been completed.');
            }

            // 3. Ensure database migrations are current
            Artisan::call('migrate', ['--force' => true]);

            return DB::transaction(function () use ($adminData, $storeData, $integrations) {
                // Step A: Create Administrator
                $admin = User::updateOrCreate(
                    ['email' => $adminData['email']],
                    [
                        'name' => $adminData['name'],
                        'password' => Hash::make($adminData['password']),
                        'email_verified_at' => now(),
                    ]
                );

                // Step B: Create / Update Store Configuration
                $store = Store::updateOrCreate(
                    ['id' => 1],
                    [
                        'name' => $storeData['name'] ?? 'Sari-Sari Store',
                        'owner_name' => $storeData['owner_name'] ?? $adminData['name'],
                        'address' => $storeData['address'] ?? null,
                        'timezone' => $storeData['timezone'] ?? 'Asia/Manila',
                        'currency' => $storeData['currency'] ?? 'PHP',
                        'currency_symbol' => $storeData['currency_symbol'] ?? '₱',
                        'target_markup_percentage' => (float) ($storeData['target_markup_percentage'] ?? 20.00),
                        'default_reorder_level' => (int) ($storeData['default_reorder_level'] ?? 5),
                        'contact_information' => $storeData['contact_information'] ?? null,
                    ]
                );

                // Step C: Save domain settings
                Setting::set('store.name', $store->name);
                Setting::set('store.currency', $store->currency);
                Setting::set('store.currency_symbol', $store->currency_symbol);
                Setting::set('inventory.default_reorder_level', $store->default_reorder_level);
                Setting::set('inventory.allow_negative_stock', false);

                // Step D: Store Encrypted Integrations
                if (!empty($integrations['gemini_api_key'])) {
                    $this->credentialService->store('gemini', 'api_key', trim($integrations['gemini_api_key']));
                    Setting::set('integrations.gemini.model', $integrations['gemini_model'] ?? 'gemini-2.5-flash-lite');
                }

                // Step E: Seed starter store inventory catalog if empty
                if (DB::table('products')->count() === 0) {
                    $seeder = new DatabaseSeeder();
                    $seeder->run();
                }

                // Step F: Mark installation as COMPLETED
                $installation = Installation::updateOrCreate(
                    ['version' => self::CURRENT_VERSION],
                    [
                        'status' => Installation::STATUS_COMPLETED,
                        'installed_at' => now(),
                    ]
                );

                return [
                    'success' => true,
                    'message' => 'Installation successfully finalized.',
                    'version' => $installation->version,
                    'installed_at' => $installation->installed_at->toIso8601String(),
                ];
            });
        } finally {
            $lock->release();
        }
    }
}
