<?php

namespace App\Services;

use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use PDO;
use PDOException;

class OnboardingService
{
    public function __construct(
        protected EnvManagerService $envManager
    ) {}

    /**
     * Retrieve current onboarding and configuration status.
     *
     * @return array<string, mixed>
     */
    public function getStatus(): array
    {
        $envValues = $this->envManager->getValues();

        $rawOnboarded = $envValues['APP_ONBOARDED'] ?? env('APP_ONBOARDED', 'false');
        $isOnboarded = filter_var($rawOnboarded, FILTER_VALIDATE_BOOLEAN);

        $geminiKey = $envValues['GEMINI_API_KEY'] ?? env('GEMINI_API_KEY', '');
        $hasGeminiKey = !empty(trim($geminiKey));

        // Masked key for preview (first 8 chars + ... + last 4 chars)
        $maskedGeminiKey = '';
        if ($hasGeminiKey) {
            $trimmed = trim($geminiKey);
            $len = strlen($trimmed);
            if ($len > 12) {
                $maskedGeminiKey = substr($trimmed, 0, 8) . '...' . substr($trimmed, -4);
            } else {
                $maskedGeminiKey = '••••••••••••';
            }
        }

        // Test active DB connectivity
        $dbConnected = false;
        $dbError = null;
        try {
            DB::connection()->getPdo();
            $dbConnected = true;
        } catch (Exception $e) {
            $dbConnected = false;
            $dbError = $e->getMessage();
        }

        return [
            'is_onboarded' => $isOnboarded,
            'has_gemini_key' => $hasGeminiKey,
            'masked_gemini_key' => $maskedGeminiKey,
            'db_connected' => $dbConnected,
            'db_error' => $dbError,
            'config' => [
                'app_name' => $envValues['APP_NAME'] ?? env('APP_NAME', 'Sari-Sari Store'),
                'db_host' => $envValues['DB_HOST'] ?? env('DB_HOST', 'mysql'),
                'db_port' => (int) ($envValues['DB_PORT'] ?? env('DB_PORT', 3306)),
                'db_database' => $envValues['DB_DATABASE'] ?? env('DB_DATABASE', 'sari_inventory'),
                'db_username' => $envValues['DB_USERNAME'] ?? env('DB_USERNAME', 'lwui'),
                'frontend_port' => (int) ($envValues['FRONTEND_PORT'] ?? env('FRONTEND_PORT', 3001)),
                'backend_port' => (int) ($envValues['BACKEND_PORT'] ?? env('BACKEND_PORT', 8000)),
            ],
        ];
    }

    /**
     * Test a candidate MySQL database connection with short timeout.
     *
     * @param array{host: string, port: int|string, database: string, username: string, password?: string} $params
     * @return array{success: bool, message: string}
     */
    public function testDatabaseConnection(array $params): array
    {
        $host = $params['host'] ?? 'mysql';
        $port = (int) ($params['port'] ?? 3306);
        $database = $params['database'] ?? 'sari_inventory';
        $username = $params['username'] ?? 'lwui';
        $password = (string) ($params['password'] ?? '');

        try {
            $dsn = "mysql:host={$host};port={$port};dbname={$database};charset=utf8mb4";
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_TIMEOUT => 4,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4",
            ];

            $pdo = new PDO($dsn, $username, $password, $options);
            $stmt = $pdo->query("SELECT 1");
            $stmt->fetch();

            return [
                'success' => true,
                'message' => "Connection established successfully to MySQL database '{$database}' on {$host}:{$port}.",
            ];
        } catch (PDOException $e) {
            return [
                'success' => false,
                'message' => "Database connection failed: " . $e->getMessage(),
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => "An unexpected error occurred: " . $e->getMessage(),
            ];
        }
    }

    /**
     * Test Google Gemini API Key validity by pinging Gemini API.
     *
     * @param string $apiKey
     * @return array{valid: bool, message: string, model?: string}
     */
    public function testGeminiApiKey(string $apiKey): array
    {
        $cleanKey = trim($apiKey);
        if (empty($cleanKey)) {
            return [
                'valid' => false,
                'message' => 'Please provide a Google Gemini API key to test.',
            ];
        }

        try {
            $model = config('services.gemini.model', 'gemini-2.5-flash-lite');
            $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}?key=" . urlencode($cleanKey);

            $response = Http::timeout(6)->get($url);

            if ($response->successful()) {
                $data = $response->json();
                $displayName = $data['displayName'] ?? $model;
                return [
                    'valid' => true,
                    'message' => "Google Gemini API key is valid and active! (Model: {$displayName})",
                    'model' => $model,
                ];
            }

            $errorData = $response->json();
            $errorMessage = $errorData['error']['message'] ?? 'Invalid or unauthorized API key from Google AI Studio.';

            return [
                'valid' => false,
                'message' => "Google Gemini rejected the key: {$errorMessage}",
            ];
        } catch (Exception $e) {
            return [
                'valid' => false,
                'message' => "Network error verifying Gemini key: " . $e->getMessage(),
            ];
        }
    }

    /**
     * Commit onboarding configuration to centralized .env and set APP_ONBOARDED=true.
     *
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    public function completeOnboarding(array $data): array
    {
        $updates = [
            'APP_ONBOARDED' => 'true',
        ];

        if (!empty($data['store_name'])) {
            $updates['APP_NAME'] = trim($data['store_name']);
        }

        if (array_key_exists('gemini_api_key', $data)) {
            $updates['GEMINI_API_KEY'] = trim((string) $data['gemini_api_key']);
        }

        if (!empty($data['db_host'])) {
            $updates['DB_HOST'] = trim($data['db_host']);
        }

        if (!empty($data['db_port'])) {
            $updates['DB_PORT'] = (int) $data['db_port'];
        }

        if (!empty($data['db_database'])) {
            $updates['DB_DATABASE'] = trim($data['db_database']);
        }

        if (!empty($data['db_username'])) {
            $updates['DB_USERNAME'] = trim($data['db_username']);
        }

        if (isset($data['db_password'])) {
            $updates['DB_PASSWORD'] = (string) $data['db_password'];
        }

        // Apply changes to .env
        $this->envManager->updateValues($updates);

        // Prepare return payload for frontend store profile sync
        $storeSettings = [
            'store_name' => $data['store_name'] ?? 'Sari-Sari Store',
            'owner_name' => $data['owner_name'] ?? 'Store Owner',
            'currency_symbol' => $data['currency_symbol'] ?? '₱',
            'default_markup_percent' => (float) ($data['default_markup_percent'] ?? 25),
            'default_reorder_level' => (int) ($data['default_reorder_level'] ?? 5),
            'enable_audio_beeper' => (bool) ($data['enable_audio_beeper'] ?? true),
        ];

        return [
            'success' => true,
            'message' => 'Onboarding configuration saved successfully! Store is ready.',
            'store_settings' => $storeSettings,
            'is_onboarded' => true,
        ];
    }
}
