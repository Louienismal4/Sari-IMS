<?php

namespace App\Services;

use App\Models\IntegrationCredential;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class IntegrationCredentialService
{
    /**
     * Store an integration credential with AES-256 encryption.
     */
    public function store(string $provider, string $key, string $value): void
    {
        $encrypted = Crypt::encryptString($value);

        IntegrationCredential::updateOrCreate(
            ['provider' => strtolower($provider), 'key' => strtolower($key)],
            ['encrypted_value' => $encrypted]
        );
    }

    /**
     * Retrieve and decrypt an integration credential.
     */
    public function get(string $provider, string $key, ?string $default = null): ?string
    {
        $credential = IntegrationCredential::where('provider', strtolower($provider))
            ->where('key', strtolower($key))
            ->first();

        if (!$credential) {
            return $default;
        }

        try {
            return Crypt::decryptString($credential->encrypted_value);
        } catch (DecryptException $e) {
            Log::error("Failed to decrypt credential for provider: {$provider}, key: {$key}");
            return $default;
        }
    }

    /**
     * Check if a credential exists.
     */
    public function exists(string $provider, string $key): bool
    {
        return IntegrationCredential::where('provider', strtolower($provider))
            ->where('key', strtolower($key))
            ->exists();
    }

    /**
     * Return a masked version of the credential for UI confirmation without secret leakage.
     */
    public function getMasked(string $provider, string $key): ?string
    {
        $val = $this->get($provider, $key);
        if (!$val) {
            return null;
        }

        $len = strlen($val);
        if ($len <= 8) {
            return str_repeat('•', $len);
        }

        return substr($val, 0, 4) . '...' . substr($val, -4);
    }

    /**
     * Delete an integration credential.
     */
    public function delete(string $provider, string $key): bool
    {
        return (bool) IntegrationCredential::where('provider', strtolower($provider))
            ->where('key', strtolower($key))
            ->delete();
    }

    /**
     * Test a Google Gemini API key by making a lightweight models request.
     */
    public function testGeminiKey(?string $apiKey = null): array
    {
        $key = $apiKey ?: $this->get('gemini', 'api_key');

        if (empty($key)) {
            return [
                'success' => false,
                'message' => 'No Gemini API key provided for testing.',
            ];
        }

        try {
            $response = Http::timeout(6)
                ->get("https://generativelanguage.googleapis.com/v1beta/models?key={$key}");

            if ($response->successful()) {
                return [
                    'success' => true,
                    'message' => 'Gemini API key is valid and connected successfully.',
                ];
            }

            $status = $response->status();
            if ($status === 400 || $status === 403) {
                return [
                    'success' => false,
                    'message' => 'Invalid Gemini API key or unauthorized access.',
                ];
            }

            return [
                'success' => false,
                'message' => "Gemini API test returned status code {$status}.",
            ];
        } catch (\Throwable $e) {
            return [
                'success' => false,
                'message' => 'Unable to reach Google Gemini API server: ' . $e->getMessage(),
            ];
        }
    }
}
