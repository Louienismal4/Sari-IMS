<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Services\OnboardingService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OnboardingController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected OnboardingService $onboardingService
    ) {}

    /**
     * Check onboarding and configuration status.
     */
    public function status(): JsonResponse
    {
        $status = $this->onboardingService->getStatus();
        return $this->success($status, 'Onboarding status retrieved');
    }

    /**
     * Test a candidate MySQL database connection.
     */
    public function testDb(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'host' => 'required|string',
            'port' => 'required|numeric',
            'database' => 'required|string',
            'username' => 'required|string',
            'password' => 'nullable|string',
        ]);

        $result = $this->onboardingService->testDatabaseConnection($validated);

        if ($result['success']) {
            return $this->success($result, $result['message']);
        }

        return $this->error($result['message'], 422, $result);
    }

    /**
     * Test a Google Gemini API Key.
     */
    public function testGemini(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'gemini_api_key' => 'required|string',
        ]);

        $result = $this->onboardingService->testGeminiApiKey($validated['gemini_api_key']);

        if ($result['valid']) {
            return $this->success($result, $result['message']);
        }

        return $this->error($result['message'], 422, $result);
    }

    /**
     * Complete onboarding and commit configuration to centralized .env.
     */
    public function setup(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'store_name' => 'nullable|string|max:100',
            'owner_name' => 'nullable|string|max:100',
            'currency_symbol' => 'nullable|string|max:10',
            'default_markup_percent' => 'nullable|numeric|min:0|max:1000',
            'default_reorder_level' => 'nullable|integer|min:0',
            'enable_audio_beeper' => 'nullable|boolean',
            'gemini_api_key' => 'nullable|string',
            'db_host' => 'nullable|string',
            'db_port' => 'nullable|numeric',
            'db_database' => 'nullable|string',
            'db_username' => 'nullable|string',
            'db_password' => 'nullable|string',
        ]);

        try {
            $result = $this->onboardingService->completeOnboarding($validated);
            return $this->success($result, $result['message']);
        } catch (Exception $e) {
            return $this->error('Failed to save configuration: ' . $e->getMessage(), 500);
        }
    }
}
