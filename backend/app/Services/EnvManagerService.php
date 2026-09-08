<?php

namespace App\Services;

use Illuminate\Support\Facades\Artisan;
use RuntimeException;

class EnvManagerService
{
    /**
     * Get the absolute path to the centralized .env file.
     */
    public function getEnvFilePath(): string
    {
        $baseEnv = base_path('.env');
        if (file_exists($baseEnv)) {
            return $baseEnv;
        }

        $parentEnv = dirname(base_path()) . '/.env';
        if (file_exists($parentEnv)) {
            return $parentEnv;
        }

        return $baseEnv;
    }

    /**
     * Read the entire .env file as an associative array.
     *
     * @return array<string, string>
     */
    public function getValues(): array
    {
        $path = $this->getEnvFilePath();
        if (!file_exists($path)) {
            return [];
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        $values = [];

        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line) || str_starts_with($line, '#')) {
                continue;
            }

            if (str_contains($line, '=')) {
                [$key, $val] = explode('=', $line, 2);
                $key = trim($key);
                $val = trim($val);
                // Strip surrounding quotes if present
                if ((str_starts_with($val, '"') && str_ends_with($val, '"')) ||
                    (str_starts_with($val, "'") && str_ends_with($val, "'"))) {
                    $val = substr($val, 1, -1);
                }
                $values[$key] = $val;
            }
        }

        return $values;
    }

    /**
     * Update or append multiple environment variables in the centralized .env file.
     * Preserves comments, empty lines, and file structure.
     *
     * @param array<string, mixed> $updates
     * @return bool
     * @throws RuntimeException
     */
    public function updateValues(array $updates): bool
    {
        $path = $this->getEnvFilePath();
        if (!file_exists($path)) {
            throw new RuntimeException("Environment configuration file not found at: {$path}");
        }

        if (!is_writable($path)) {
            throw new RuntimeException("Environment configuration file is not writable: {$path}");
        }

        $contents = file_get_contents($path);
        if ($contents === false) {
            throw new RuntimeException("Unable to read .env file at: {$path}");
        }

        $lines = explode("\n", $contents);
        $keysToUpdate = $updates;

        foreach ($lines as $index => $line) {
            $trimmed = trim($line);
            if (empty($trimmed) || str_starts_with($trimmed, '#')) {
                continue;
            }

            if (str_contains($trimmed, '=')) {
                [$key] = explode('=', $trimmed, 2);
                $key = trim($key);

                if (array_key_exists($key, $keysToUpdate)) {
                    $formattedValue = $this->formatEnvValue($keysToUpdate[$key]);
                    $lines[$index] = "{$key}={$formattedValue}";
                    unset($keysToUpdate[$key]);
                }
            }
        }

        // Any remaining keys not already present get appended at the bottom
        if (!empty($keysToUpdate)) {
            if (!empty($lines) && end($lines) !== '') {
                $lines[] = '';
            }
            foreach ($keysToUpdate as $key => $val) {
                $formattedValue = $this->formatEnvValue($val);
                $lines[] = "{$key}={$formattedValue}";
            }
        }

        $newContents = implode("\n", $lines);
        $result = file_put_contents($path, $newContents, LOCK_EX);
        if ($result === false) {
            throw new RuntimeException("Failed to write updated values to: {$path}");
        }

        // Synchronize in-memory config and clear config cache
        $this->syncRuntimeConfig($updates);

        return true;
    }

    /**
     * Format an env value with appropriate escaping and quotes.
     */
    protected function formatEnvValue(mixed $value): string
    {
        if ($value === null) {
            return '';
        }

        if (is_bool($value)) {
            return $value ? 'true' : 'false';
        }

        $str = (string) $value;

        // If string contains spaces, quotes, or special characters, quote it
        if (preg_match('/[\s#="\'`$]/', $str) || $str === '') {
            $escaped = str_replace('"', '\"', $str);
            return "\"{$escaped}\"";
        }

        return $str;
    }

    /**
     * Update runtime Laravel config for immediate usage without restart.
     */
    protected function syncRuntimeConfig(array $updates): void
    {
        if (isset($updates['GEMINI_API_KEY'])) {
            config(['services.gemini.api_key' => (string) $updates['GEMINI_API_KEY']]);
        }
        if (isset($updates['GEMINI_MODEL'])) {
            config(['services.gemini.model' => (string) $updates['GEMINI_MODEL']]);
        }
        if (isset($updates['APP_NAME'])) {
            config(['app.name' => (string) $updates['APP_NAME']]);
        }
        if (isset($updates['APP_ONBOARDED'])) {
            config(['app.onboarded' => filter_var($updates['APP_ONBOARDED'], FILTER_VALIDATE_BOOLEAN)]);
        }

        try {
            Artisan::call('config:clear');
        } catch (\Throwable) {
            // Non-fatal if artisan command fails in isolated context
        }
    }
}
