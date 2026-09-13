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

    public function test_can_reset_database_in_production_environment(): void
    {
        Installation::create([
            'version' => '1.0.0',
            'status' => Installation::STATUS_COMPLETED,
            'installed_at' => now(),
        ]);

        $this->app->detectEnvironment(fn() => 'production');

        $response = $this->postJson('/api/database/reset', [
            'confirmation' => 'confirm to reset my database',
            'mode' => 'clean_slate',
        ]);

        $response->assertStatus(200);
    }

    public function test_reset_preserves_categories_when_requested(): void
    {
        $cat = Category::create(['name' => 'Custom Category']);
        Product::create([
            'category_id' => $cat->id,
            'barcode' => '9999999999999',
            'name' => 'Sample Product',
            'unit' => 'pc',
            'cost_price' => 5.00,
            'selling_price' => 8.00,
            'stock_quantity' => 20,
            'reorder_level' => 5,
        ]);

        $response = $this->postJson('/api/database/reset', [
            'confirmation' => 'confirm to reset my database',
            'mode' => 'keep_categories',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseCount('products', 0);
        $this->assertDatabaseHas('categories', ['name' => 'Custom Category']);
    }
}
