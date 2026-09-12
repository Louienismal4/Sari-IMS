<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Installation;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Tests\TestCase;

class DatabaseResetTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(ThrottleRequests::class);
    }

    public function test_can_reset_database_with_valid_confirmation(): void
    {
        $cat = Category::create(['name' => 'Snacks']);
        Product::create([
            'category_id' => $cat->id,
            'barcode' => '1234567890123',
            'name' => 'Test Cracker',
            'unit' => 'pack',
            'cost_price' => 10.00,
            'selling_price' => 15.00,
            'stock_quantity' => 10,
            'reorder_level' => 2,
        ]);

        $this->assertDatabaseCount('products', 1);

        $response = $this->postJson('/api/database/reset', [
            'confirmation' => 'confirm to reset my database',
            'mode' => 'clean_slate',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseCount('products', 0);
        // Default categories should be created
        $this->assertDatabaseHas('categories', ['name' => 'Canned Goods']);
    }

    public function test_rejects_reset_with_invalid_confirmation(): void
    {
        $response = $this->postJson('/api/database/reset', [
            'confirmation' => 'wrong confirmation phrase',
            'mode' => 'clean_slate',
        ]);

        $response->assertStatus(422);
    }

    public function test_production_allows_reset_when_admin_secret_is_not_configured(): void
    {
        Installation::create([
            'version' => '1.0.0',
            'status' => Installation::STATUS_COMPLETED,
            'installed_at' => now(),
        ]);

        $this->app->detectEnvironment(fn() => 'production');
        config(['app.admin_secret' => null]);

        $response = $this->postJson('/api/database/reset', [
            'confirmation' => 'confirm to reset my database',
            'mode' => 'clean_slate',
        ]);

        $response->assertStatus(200);
    }

    public function test_production_enforces_admin_secret_when_configured(): void
    {
        Installation::create([
            'version' => '1.0.0',
            'status' => Installation::STATUS_COMPLETED,
            'installed_at' => now(),
        ]);

        $this->app->detectEnvironment(fn() => 'production');
        config(['app.admin_secret' => 'super-secret-admin-key']);

        $forbiddenResponse = $this->postJson('/api/database/reset', [
            'confirmation' => 'confirm to reset my database',
            'mode' => 'clean_slate',
        ]);

        $forbiddenResponse->assertStatus(403)
            ->assertJsonPath('message', 'Database reset is disabled in production environments without valid admin authorization.');

        $wrongResponse = $this->postJson('/api/database/reset', [
            'confirmation' => 'confirm to reset my database',
            'mode' => 'clean_slate',
            'admin_secret' => 'wrong-secret',
        ]);

        $wrongResponse->assertStatus(403);

        $validResponse = $this->withHeaders([
            'X-Admin-Secret' => 'super-secret-admin-key',
        ])->postJson('/api/database/reset', [
            'confirmation' => 'confirm to reset my database',
            'mode' => 'clean_slate',
        ]);

        $validResponse->assertStatus(200);
    }
}
