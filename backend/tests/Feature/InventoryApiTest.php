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
}
