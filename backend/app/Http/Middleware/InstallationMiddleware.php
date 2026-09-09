<?php

namespace App\Http\Middleware;

use App\Services\InstallationService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class InstallationMiddleware
{
    /**
     * Whitelist of routes accessible before installation is completed.
     */
    protected array $preInstallWhitelist = [
        'api/installation/*',
        'api/setup/*',
        'api/onboarding/*',
        'api/health',
        'up',
    ];

    /**
     * Routes strictly locked after installation is completed.
     */
    protected array $lockedAfterInstall = [
        'api/setup/complete',
        'api/setup/admin',
        'api/setup/store',
        'api/onboarding/setup',
    ];

    public function __construct(
        protected InstallationService $installationService
    ) {}

    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $isInstalled = $this->installationService->isInstalled();

        if (!$isInstalled) {
            // Uninstalled: allow only whitelisted setup and diagnostic endpoints
            foreach ($this->preInstallWhitelist as $pattern) {
                if ($request->is($pattern)) {
                    return $next($request);
                }
            }

            return response()->json([
                'error' => 'Installation pending',
                'message' => 'The application has not been installed yet. Please complete setup at /setup.',
                'installed' => false,
            ], 403);
        }

        // Installed: strictly lock mutating setup endpoints
        foreach ($this->lockedAfterInstall as $pattern) {
            if ($request->is($pattern)) {
                return response()->json([
                    'error' => 'Installation already completed',
                    'message' => 'Setup operations are locked. This instance has already been finalized.',
                    'installed' => true,
                ], 403);
            }
        }

        return $next($request);
    }
}
