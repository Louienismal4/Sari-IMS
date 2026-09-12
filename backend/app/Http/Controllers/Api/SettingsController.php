<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Services\EnvManagerService;
use App\Services\IntegrationCredentialService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class SettingsController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected IntegrationCredentialService $credentialService,
        protected EnvManagerService $envManager
    ) {}

    /**
     * Update or store external integration credentials (e.g. Google Gemini AI).
     * POST /api/settings/integrations
     */
    public function updateIntegration(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'provider' => 'required|string|in:gemini',
            'api_key' => 'required|string|max:500',
            'model' => 'nullable|string|max:100',
        ]);

        if ($validator->fails()) {
            return $this->error('Validation failed', 422, $validator->errors()->toArray());
        }

        $provider = strtolower($request->input('provider'));
        $apiKey = trim($request->input('api_key'));
        $model = $request->input('model', 'gemini-2.5-flash-lite');

        // 1. Store encrypted in database
        $this->credentialService->store($provider, 'api_key', $apiKey);

        // 2. Update model preference in database settings
        Setting::set("integrations.{$provider}.model", $model);

        // 3. Update runtime in-memory config for immediate availability
        if ($provider === 'gemini') {
            config(['services.gemini.api_key' => $apiKey]);
            config(['services.gemini.model' => $model]);
        }

        // 4. Best-effort sync to centralized .env file
        try {
            if ($provider === 'gemini') {
                $this->envManager->updateValues([
                    'GEMINI_API_KEY' => $apiKey,
                    'GEMINI_MODEL' => $model,
                ]);
            }
        } catch (\Throwable $e) {
            Log::info("SettingsController: Skipped writing to .env file: {$e->getMessage()}");
        }

        return $this->success([
            'provider' => $provider,
            'has_gemini_key' => true,
            'masked_gemini_key' => $this->credentialService->getMasked($provider, 'api_key'),
            'model' => $model,
        ], 'Integration credentials saved and encrypted successfully.');
    }

    /**
     * Delete integration credentials.
     * DELETE /api/settings/integrations/{provider}
     */
    public function deleteIntegration(string $provider): JsonResponse
    {
        $provider = strtolower($provider);

        if ($provider !== 'gemini') {
            return $this->error("Unsupported integration provider: {$provider}", 400);
        }

        $this->credentialService->delete($provider, 'api_key');

        if ($provider === 'gemini') {
            config(['services.gemini.api_key' => '']);
        }

        try {
            if ($provider === 'gemini') {
                $this->envManager->updateValues([
                    'GEMINI_API_KEY' => '',
                ]);
            }
        } catch (\Throwable $e) {
            Log::info("SettingsController: Skipped clearing in .env file: {$e->getMessage()}");
        }

        return $this->success([
            'provider' => $provider,
            'has_gemini_key' => false,
            'masked_gemini_key' => null,
        ], ucfirst($provider) . ' integration credentials removed successfully.');
    }

    /**
     * Test external integration service.
     * POST /api/settings/test-integration
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
}
