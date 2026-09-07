<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InventoryApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_health_check_endpoint(): void
    {
        $response = $this->getJson('/api/health');
        $response->assertStatus(200)
            ->assertJson(['status' => 'ok']);
    }

    public function test_can_list_categories(): void
    {
        $response = $this->getJson('/api/categories');
        $response->assertStatus(200)
            ->assertJsonStructure(['status', 'data']);
    }

    public function test_can_create_and_fetch_product(): void
    {
        $payload = [
            'name' => 'Lucky Me Pancit Canton',
            'unit' => 'pc',
            'cost_price' => 12.50,
            'selling_price' => 16.00,
            'stock_quantity' => 20,
            'reorder_level' => 5,
        ];

        $createResponse = $this->postJson('/api/products', $payload);
        $createResponse->assertStatus(201)
            ->assertJsonPath('data.name', 'Lucky Me Pancit Canton');

        $listResponse = $this->getJson('/api/products');
        $listResponse->assertStatus(200)
            ->assertJsonStructure(['status', 'data'])
            ->assertJsonFragment(['name' => 'Lucky Me Pancit Canton']);
    }

    public function test_can_record_stock_movement(): void
    {
        $product = \App\Models\Product::create([
            'name' => 'Kopiko Blanca',
            'unit' => 'sachet',
            'cost_price' => 8.00,
            'selling_price' => 12.00,
            'stock_quantity' => 10,
        ]);

        $movementPayload = [
            'product_id' => $product->id,
            'type' => 'restock',
            'quantity_change' => 15,
            'notes' => 'Weekly supplier delivery',
        ];

        $response = $this->postJson('/api/stock-movements', $movementPayload);
        $response->assertStatus(201)
            ->assertJsonPath('data.quantity_change', 15);

        $this->assertEquals(25, $product->fresh()->stock_quantity);
    }

    public function test_batch_store_creates_new_products(): void
    {
        $payload = [
            'products' => [
                [
                    'name' => 'Coca-Cola 1.5L',
                    'barcode' => '4800016644002',
                    'unit' => 'pc',
                    'cost_price' => 58.00,
                    'selling_price' => 70.00,
                    'stock_quantity' => 24,
                    'reorder_level' => 5,
                ],
                [
                    'name' => 'Bear Brand 33g',
                    'barcode' => '4800361376511',
                    'unit' => 'sachet',
                    'cost_price' => 14.50,
                    'selling_price' => 18.00,
                    'stock_quantity' => 48,
                    'reorder_level' => 10,
                ],
            ],
        ];

        $response = $this->postJson('/api/products/batch', $payload);
        $response->assertStatus(201);

        $this->assertDatabaseHas('products', ['barcode' => '4800016644002', 'stock_quantity' => 24]);
        $this->assertDatabaseHas('products', ['barcode' => '4800361376511', 'stock_quantity' => 48]);
    }

    public function test_batch_store_same_barcode_with_replace_mode(): void
    {
        // Existing product with barcode 4801111111111 and stock 10
        \App\Models\Product::create([
            'name' => 'Original Item',
            'barcode' => '4801111111111',
            'unit' => 'pc',
            'cost_price' => 20.00,
            'selling_price' => 25.00,
            'stock_quantity' => 10,
        ]);

        // Re-import with stock_quantity = 30 in replace mode (default)
        $payload = [
            'update_mode' => 'replace',
            'products' => [
                [
                    'name' => 'Updated Item Name',
                    'barcode' => '4801111111111',
                    'unit' => 'pc',
                    'cost_price' => 22.00,
                    'selling_price' => 28.00,
                    'stock_quantity' => 30,
                ],
            ],
        ];

        $response = $this->postJson('/api/products/batch', $payload);
        $response->assertStatus(201);

        $product = \App\Models\Product::where('barcode', '4801111111111')->first();
        $this->assertNotNull($product);
        // In replace mode, stock becomes 30 (not 40)
        $this->assertEquals(30, $product->stock_quantity);
        $this->assertEquals(22.00, (float) $product->cost_price);
        $this->assertEquals(28.00, (float) $product->selling_price);
        $this->assertEquals('Updated Item Name', $product->name);
    }

    public function test_batch_store_same_barcode_with_add_mode(): void
    {
        // Existing product with stock 10
        \App\Models\Product::create([
            'name' => 'Existing Stock Item',
            'barcode' => '4802222222222',
            'unit' => 'pc',
            'cost_price' => 15.00,
            'selling_price' => 20.00,
            'stock_quantity' => 10,
        ]);

        // Re-import with stock_quantity = 25 in add mode
        $payload = [
            'update_mode' => 'add',
            'products' => [
                [
                    'name' => 'Existing Stock Item',
                    'barcode' => '4802222222222',
                    'unit' => 'pc',
                    'cost_price' => 16.00,
                    'selling_price' => 22.00,
                    'stock_quantity' => 25,
                ],
            ],
        ];

        $response = $this->postJson('/api/products/batch', $payload);
        $response->assertStatus(201);

        $product = \App\Models\Product::where('barcode', '4802222222222')->first();
        // In add mode, stock becomes 10 + 25 = 35
        $this->assertEquals(35, $product->stock_quantity);
        $this->assertEquals(16.00, (float) $product->cost_price);
        $this->assertEquals(22.00, (float) $product->selling_price);
    }

    public function test_batch_store_validation_rejects_negative_prices_or_missing_names(): void
    {
        $payload = [
            'products' => [
                [
                    'name' => '', // missing name
                    'unit' => 'pc',
                    'cost_price' => -5.00, // negative price
                    'selling_price' => 10.00,
                    'stock_quantity' => 5,
                ],
            ],
        ];

        $response = $this->postJson('/api/products/batch', $payload);
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['products.0.name', 'products.0.cost_price']);
    }
}
