<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\InstallationService;
use App\Services\IntegrationCredentialService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class SetupController extends Controller
{
    public function __construct(
        protected InstallationService $installationService,
        protected IntegrationCredentialService $credentialService
    ) {}

    /**
     * Return installation status and diagnostic health.
     * GET /api/installation/status
     */
    public function status(): JsonResponse
    {
        $status = $this->installationService->getStatus();
        return response()->json($status);
    }

    /**
     * Test database connectivity.
     * POST /api/setup/test-db
     */
    public function testDatabase(): JsonResponse
    {
        $result = $this->installationService->testDatabase();
        return response()->json($result, $result['connected'] ? 200 : 503);
    }

    /**
     * Test Redis connectivity.
     * POST /api/setup/test-redis
     */
    public function testRedis(): JsonResponse
    {
        $result = $this->installationService->testRedis();
        return response()->json($result, $result['connected'] ? 200 : 503);
    }

    /**
     * Test external integration service.
     * POST /api/setup/test-integration
     */
    public function testIntegration(Request $request): JsonResponse
    {
        $provider = strtolower($request->input('provider', 'gemini'));

        if ($provider === 'gemini') {
            $apiKey = $request->input('api_key');
            $result = $this->credentialService->testGeminiKey($apiKey);
            return response()->json($result, $result['success'] ? 200 : 422);
        }

        return response()->json([
            'success' => false,
            'message' => "Unsupported integration provider: {$provider}",
        ], 400);
    }

    /**
     * Complete installation transactionally.
     * POST /api/setup/complete
     */
    public function complete(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'admin.name' => 'required|string|max:100',
            'admin.email' => 'required|email|max:150',
            'admin.password' => 'required|string|min:6',
            'store.name' => 'required|string|max:150',
            'store.owner_name' => 'nullable|string|max:100',
            'store.address' => 'nullable|string|max:255',
            'store.timezone' => 'nullable|string|max:50',
            'store.currency' => 'nullable|string|max:10',
            'store.currency_symbol' => 'nullable|string|max:10',
            'store.target_markup_percentage' => 'nullable|numeric|min:0|max:1000',
            'store.default_reorder_level' => 'nullable|integer|min:0|max:10000',
            'integrations.gemini_api_key' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();

        try {
            $result = $this->installationService->completeInstallation(
                $validated['admin'],
                $validated['store'] ?? [],
                $validated['integrations'] ?? []
            );

            return response()->json($result);
        } catch (\RuntimeException $e) {
            return response()->json([
                'error' => 'Installation error',
                'message' => $e->getMessage(),
            ], 409);
        } catch (\Throwable $e) {
            return response()->json([
                'error' => 'Unexpected error',
                'message' => 'Failed to finalize installation: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Liveness health check.
     * GET /health, GET /api/health
     */
    public function health(): JsonResponse
    {
        return response()->json([
            'status' => 'ok',
            'timestamp' => now()->toIso8601String(),
        ], 200);
    }

    /**
     * Readiness probe verifying infrastructure dependencies.
     * GET /health/ready, GET /api/health/ready
     */
    public function ready(): JsonResponse
    {
        $db = $this->installationService->testDatabase();
        $redis = $this->installationService->testRedis();
        $storage = is_writable(storage_path('framework'));
        $installed = $this->installationService->isInstalled();

        $allHealthy = $db['connected'] && $redis['connected'] && $storage;

        return response()->json([
            'status' => $allHealthy ? 'ok' : 'degraded',
            'timestamp' => now()->toIso8601String(),
            'checks' => [
                'database' => $db['connected'],
                'redis' => $redis['connected'],
                'storage_writable' => $storage,
                'installed' => $installed,
            ],
        ], $allHealthy ? 200 : 503);
    }
}
