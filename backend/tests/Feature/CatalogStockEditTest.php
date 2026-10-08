<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CatalogStockEditTest extends TestCase
{
    use RefreshDatabase;

    private Product $product;

    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAs(User::factory()->create(), 'sanctum');
        $this->product = Product::create([
            'name' => 'Coffee',
            'unit' => 'pc',
            'cost_price' => 8,
            'selling_price' => 12,
            'stock_quantity' => 10,
        ]);
    }

    public function test_name_edit_with_unchanged_stock_preserves_sale(): void
    {
        $opened = $this->getJson("/api/products/{$this->product->id}")
            ->assertOk()->json('data');

        $this->postJson('/api/pos/checkout', [
            'payment_type' => 'cash',
            'amount_tendered' => 24,
            'items' => [['product_id' => $this->product->id, 'quantity' => 2]],
        ])->assertCreated();

        $this->putJson("/api/products/{$this->product->id}", [
            'name' => 'Renamed coffee',
            'stock_quantity' => $opened['stock_quantity'],
            'original_stock_quantity' => $opened['stock_quantity'],
        ])->assertOk()
            ->assertJsonPath('data.name', 'Renamed coffee')
            ->assertJsonPath('data.stock_quantity', 8);

        $this->getJson("/api/products/{$this->product->id}")
            ->assertOk()->assertJsonPath('data.stock_quantity', 8);
    }

    public function test_unchanged_stock_preserves_restock_and_metadata_only_edits_work(): void
    {
        $this->postJson('/api/stock-movements', [
            'product_id' => $this->product->id,
            'type' => 'restock',
            'quantity_change' => 5,
        ])->assertCreated();

        $this->putJson("/api/products/{$this->product->id}", [
            'selling_price' => 15,
            'stock_quantity' => 10,
            'original_stock_quantity' => 10,
        ])->assertOk()->assertJsonPath('data.stock_quantity', 15);

        $this->putJson("/api/products/{$this->product->id}", [
            'name' => 'New coffee name',
        ])->assertOk()
            ->assertJsonPath('data.name', 'New coffee name')
            ->assertJsonPath('data.stock_quantity', 15);
    }

    public function test_stale_stock_correction_rejects_entire_edit(): void
    {
        $this->postJson('/api/pos/checkout', [
            'payment_type' => 'cash',
            'amount_tendered' => 24,
            'items' => [['product_id' => $this->product->id, 'quantity' => 2]],
        ])->assertCreated();

        $this->putJson("/api/products/{$this->product->id}", [
            'name' => 'Rejected name',
            'stock_quantity' => 12,
            'original_stock_quantity' => 10,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('stock_quantity')
            ->assertJsonPath('errors.stock_quantity.0', 'Stock changed while this form was open. Refresh the catalog and reopen the product before correcting stock.');

        $this->getJson("/api/products/{$this->product->id}")
            ->assertOk()
            ->assertJsonPath('data.name', 'Coffee')
            ->assertJsonPath('data.stock_quantity', 8);

        $this->putJson("/api/products/{$this->product->id}", [
            'stock_quantity' => 12,
            'original_stock_quantity' => 8,
        ])->assertOk()->assertJsonPath('data.stock_quantity', 12);
    }

    public function test_stock_correction_requires_valid_original_stock_and_allows_zero(): void
    {
        $this->putJson("/api/products/{$this->product->id}", [
            'stock_quantity' => 0,
        ])->assertUnprocessable()->assertJsonValidationErrors('original_stock_quantity');

        $this->putJson("/api/products/{$this->product->id}", [
            'stock_quantity' => 0,
            'original_stock_quantity' => -1,
        ])->assertUnprocessable()->assertJsonValidationErrors('original_stock_quantity');

        $this->putJson("/api/products/{$this->product->id}", [
            'stock_quantity' => -1,
            'original_stock_quantity' => 10,
        ])->assertUnprocessable()->assertJsonValidationErrors('stock_quantity');

        $this->putJson("/api/products/{$this->product->id}", [
            'stock_quantity' => 0,
            'original_stock_quantity' => 10,
        ])->assertOk()->assertJsonPath('data.stock_quantity', 0);
    }
}
