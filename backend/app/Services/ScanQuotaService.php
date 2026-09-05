<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;

class ScanQuotaService
{
    private const DAILY_LIMIT = 1500;
    private const DEFAULT_LAST_TOKENS = 380;
    private const DAILY_TOKEN_LIMIT = 1000000;

    /**
     * Get the current scan quota metrics.
     */
    public function getQuota(): array
    {
        $todayKey = 'gemini_scans_' . date('Y-m-d');
        $scansToday = (int) Cache::get($todayKey, 0);
        $remaining = max(0, self::DAILY_LIMIT - $scansToday);
        $lastTokens = (int) Cache::get('gemini_last_tokens', self::DEFAULT_LAST_TOKENS);

        return [
            'scans_used_today' => $scansToday,
            'scans_remaining_today' => $remaining,
            'daily_limit' => self::DAILY_LIMIT,
            'tokens_used_last_scan' => $lastTokens,
            'approx_tokens_remaining' => max(0, self::DAILY_TOKEN_LIMIT - ($lastTokens * $scansToday)),
            'reset_time' => '00:00 UTC',
        ];
    }

    /**
     * Record a scan event and update token counters.
     */
    public function recordScan(int $tokenCount, ?string $modelUsed = null): array
    {
        $todayKey = 'gemini_scans_' . date('Y-m-d');
        $scansToday = (int) Cache::get($todayKey, 0) + 1;
        Cache::put($todayKey, $scansToday, now()->endOfDay());

        if ($tokenCount > 0) {
            Cache::put('gemini_last_tokens', $tokenCount, now()->addDays(7));
        }

        $remaining = max(0, self::DAILY_LIMIT - $scansToday);

        return [
            'scans_used_today' => $scansToday,
            'scans_remaining_today' => $remaining,
            'daily_limit' => self::DAILY_LIMIT,
            'tokens_used_last_scan' => $tokenCount,
            'approx_tokens_remaining' => max(0, self::DAILY_TOKEN_LIMIT - ($tokenCount * $scansToday)),
            'model_used' => $modelUsed,
        ];
    }
}
