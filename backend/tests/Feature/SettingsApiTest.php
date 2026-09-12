<?php

namespace Tests\Feature;

use App\Models\Installation;
use App\Services\IntegrationCredentialService;
use App\Services\ReceiptOcrService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Tests\TestCase;

class SettingsApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(ThrottleRequests::class);
    }

    public function test_can_update_gemini_integration_when_installed(): void
    {
        Installation::create([
            'version' => '1.0.0',
            'status' => Installation::STATUS_COMPLETED,
            'installed_at' => now(),
        ]);

        $testKey = 'AIzaSyTestSecretKey1234567890abcdef';

        $response = $this->postJson('/api/settings/integrations', [
            'provider' => 'gemini',
            'api_key' => $testKey,
            'model' => 'gemini-2.5-flash-lite',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.has_gemini_key', true)
            ->assertJsonPath('data.masked_gemini_key', 'AIza...cdef');

        // Check encrypted in database
        $credentialService = app(IntegrationCredentialService::class);
        $this->assertTrue($credentialService->exists('gemini', 'api_key'));
        $this->assertEquals($testKey, $credentialService->get('gemini', 'api_key'));

        // Check installation status reflects the key
        $statusRes = $this->getJson('/api/installation/status');
        $statusRes->assertStatus(200)
            ->assertJsonPath('has_gemini_key', true)
            ->assertJsonPath('masked_gemini_key', 'AIza...cdef');
    }

    public function test_can_delete_gemini_integration(): void
    {
        Installation::create([
            'version' => '1.0.0',
            'status' => Installation::STATUS_COMPLETED,
            'installed_at' => now(),
        ]);

        $credentialService = app(IntegrationCredentialService::class);
        $credentialService->store('gemini', 'api_key', 'some-gemini-key');

        $this->assertTrue($credentialService->exists('gemini', 'api_key'));

        $response = $this->deleteJson('/api/settings/integrations/gemini');
        $response->assertStatus(200)
            ->assertJsonPath('data.has_gemini_key', false)
            ->assertJsonPath('data.masked_gemini_key', null);

        $this->assertFalse($credentialService->exists('gemini', 'api_key'));
    }

    public function test_rejects_invalid_provider(): void
    {
        Installation::create([
            'version' => '1.0.0',
            'status' => Installation::STATUS_COMPLETED,
            'installed_at' => now(),
        ]);

        $response = $this->postJson('/api/settings/integrations', [
            'provider' => 'unsupported_ai',
            'api_key' => 'xyz',
        ]);

        $response->assertStatus(422);
    }
}
