<?php

namespace Tests\Feature;

use App\Models\Installation;
use App\Models\IntegrationCredential;
use App\Models\User;
use App\Services\ReceiptOcrService;
use App\Services\EnvManagerService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class IntegrationSettingsPersistenceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAs(User::factory()->create(), 'sanctum');
        $this->withoutMiddleware(ThrottleRequests::class);
        Installation::create([
            'version' => '1.0.0',
            'status' => Installation::STATUS_COMPLETED,
            'installed_at' => now(),
        ]);
        Http::fake(['*' => Http::response([
            'candidates' => [['content' => ['parts' => [['text' => '{"items":[]}']]]]],
        ])]);
    }

    public function test_saved_key_and_model_are_used_after_runtime_configuration_is_reset(): void
    {
        $this->postJson('/api/settings/integrations', [
            'provider' => 'gemini',
            'api_key' => 'saved-database-key',
            'model' => 'gemini-2.5-pro',
        ])->assertOk();

        $this->assertNotSame('saved-database-key', IntegrationCredential::firstOrFail()->encrypted_value);

        config(['services.gemini.api_key' => 'old-environment-key', 'services.gemini.model' => 'gemini-2.5-flash']);

        $result = (new ReceiptOcrService)->processReceipt('aW1hZ2U=');

        $this->assertSame('gemini-2.5-pro', $result['usedModel']);
        Http::assertSent(fn ($request) => $request->hasHeader('x-goog-api-key', 'saved-database-key')
            && str_ends_with($request->url(), '/gemini-2.5-pro:generateContent'));
    }

    public function test_settings_never_write_command_substitutions_to_environment_files(): void
    {
        $this->mock(EnvManagerService::class)->shouldNotReceive('updateValues');

        $this->postJson('/api/settings/integrations', [
            'provider' => 'gemini',
            'api_key' => '$(printf harmless)',
            'model' => '`printf harmless`',
        ])->assertOk();

        $this->deleteJson('/api/settings/integrations/gemini')->assertOk();
    }

    public function test_deleted_key_cannot_be_reactivated_by_an_old_environment_copy(): void
    {
        $this->postJson('/api/settings/integrations', [
            'provider' => 'gemini',
            'api_key' => 'removed-key',
        ])->assertOk();
        $this->deleteJson('/api/settings/integrations/gemini')->assertOk();

        config(['services.gemini.api_key' => 'removed-key']);

        $this->postJson('/api/scan-receipt', ['image_base64' => 'aW1hZ2U='])
            ->assertStatus(503)
            ->assertJsonPath('message', 'Gemini API key is not configured on this server. Please save your Gemini API key in Settings or during Setup.');
        Http::assertNothingSent();
        $this->getJson('/api/installation/status')->assertJsonPath('has_gemini_key', false);
    }

    public function test_ocr_uses_environment_model_when_no_preference_exists(): void
    {
        app(\App\Services\IntegrationCredentialService::class)->store('gemini', 'api_key', 'setup-key');
        config(['services.gemini.model' => 'gemini-2.5-pro']);

        $this->assertSame('gemini-2.5-pro', (new ReceiptOcrService)->processReceipt('aW1hZ2U=')['usedModel']);
    }

    public function test_null_model_uses_configuration_default_without_changing_runtime_configuration(): void
    {
        config(['services.gemini.model' => 'gemini-2.5-pro', 'services.gemini.api_key' => 'environment-key']);

        $this->postJson('/api/settings/integrations', [
            'provider' => 'gemini',
            'api_key' => 'database-key',
            'model' => null,
        ])->assertOk()->assertJsonPath('data.model', 'gemini-2.5-pro');

        $this->assertSame('environment-key', config('services.gemini.api_key'));
        $this->assertSame('gemini-2.5-pro', (new ReceiptOcrService)->processReceipt('aW1hZ2U=')['usedModel']);
    }
}
