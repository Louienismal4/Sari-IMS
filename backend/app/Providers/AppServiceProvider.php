<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Phase 27: Redact sensitive secrets from application logging
        try {
            \Illuminate\Support\Facades\Log::tap(function ($logger) {
                if (method_exists($logger, 'pushProcessor')) {
                    $logger->pushProcessor(function ($record) {
                        $sensitive = [
                            'password',
                            'password_confirmation',
                            'api_key',
                            'gemini_api_key',
                            'secret',
                            'authorization',
                            'db_password',
                            'redis_password',
                            'token',
                        ];

                        if (is_object($record) && property_exists($record, 'context') && is_array($record->context)) {
                            $context = $record->context;
                            array_walk_recursive($context, function (&$val, $key) use ($sensitive) {
                                if (in_array(strtolower((string) $key), $sensitive, true)) {
                                    $val = '[REDACTED]';
                                }
                            });
                            if (method_exists($record, 'with')) {
                                return $record->with(context: $context);
                            }
                        }
                        return $record;
                    });
                }
            });
        } catch (\Throwable $e) {
            // Gracefully ignore if logger tap is unsupported in specific context
        }
    }
}
