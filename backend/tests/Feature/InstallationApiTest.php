<?php

namespace Tests\Feature;

use App\Models\Installation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InstallationApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_setup_endpoints_are_accessible_when_uninstalled(): void
    {
        config(['app.enforce_installation_middleware_in_tests' => true]);

        $response = $this->getJson('/api/installation/status');
        $response->assertStatus(200)
            ->assertJsonPath('installed', false)
            ->assertJsonPath('status', 'pending');

        $health = $this->getJson('/health');
        $health->assertStatus(200)
            ->assertJson(['status' => 'ok']);
    }

    public function test_normal_api_endpoints_are_blocked_when_uninstalled(): void
    {
        config(['app.enforce_installation_middleware_in_tests' => true]);

        $response = $this->getJson('/api/products');
        $response->assertStatus(403)
            ->assertJson([
                'error' => 'Installation pending',
                'installed' => false,
            ]);
    }

    public function test_setup_completion_locks_mutating_endpoints_and_unlocks_normal_routes(): void
    {
        config(['app.enforce_installation_middleware_in_tests' => true]);

        $setupPayload = [
            'admin' => [
                'name' => 'Store Manager',
                'email' => 'manager@teststore.local',
                'password' => 'secret123',
            ],
            'store' => [
                'name' => 'My Test Sari Store',
                'currency' => 'PHP',
                'currency_symbol' => '₱',
                'target_markup_percentage' => 25,
                'default_reorder_level' => 10,
            ],
        ];

        $completeResponse = $this->postJson('/api/setup/complete', $setupPayload);
        $completeResponse->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('installations', [
            'status' => Installation::STATUS_COMPLETED,
        ]);

        // Status should now be installed = true
        $statusResponse = $this->getJson('/api/installation/status');
        $statusResponse->assertStatus(200)
            ->assertJsonPath('installed', true)
            ->assertJsonPath('status', Installation::STATUS_COMPLETED);

        // Mutating setup route should now be locked (403)
        $lockedResponse = $this->postJson('/api/setup/complete', $setupPayload);
        $lockedResponse->assertStatus(403)
            ->assertJsonPath('error', 'Installation already completed');

        // Normal routes should now be unlocked
        $productsResponse = $this->getJson('/api/products');
        $productsResponse->assertStatus(200);
    }
}
