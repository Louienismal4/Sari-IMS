<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\StockAudit;
use App\Models\StockMovement;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StockAuditTest extends TestCase
{
    use RefreshDatabase;

    private Product $productA;
    private Product $productB;

    protected function setUp(): void
    {
        parent::setUp();

        $category = Category::create(['name' => 'Instant Noodles']);

        // Product A: 10 initial stock
        $this->productA = Product::create([
            'category_id' => $category->id,
            'barcode' => '4800016644810',
            'name' => 'Lucky Me! Pancit Canton Original',
            'unit' => 'pc',
            'cost_price' => 12.00,
            'selling_price' => 16.00,
            'stock_quantity' => 10,
            'reorder_level' => 5,
        ]);

        // Product B: 20 initial stock
        $this->productB = Product::create([
            'category_id' => $category->id,
            'barcode' => '4800016644834',
            'name' => 'Lucky Me! Extra Hot',
            'unit' => 'pc',
            'cost_price' => 12.50,
            'selling_price' => 17.00,
            'stock_quantity' => 20,
            'reorder_level' => 5,
        ]);
    }

    public function test_can_fetch_live_audit_sheet_with_starting_and_restocked_quantities(): void
    {
        // Simulate mid-week delivery of 15 packs for Product A
        StockMovement::create([
            'product_id' => $this->productA->id,
            'type' => 'restock',
            'quantity_change' => 15,
            'notes' => 'Wednesday delivery',
        ]);
        $this->productA->update(['stock_quantity' => 25]);

        $response = $this->getJson('/api/audits/sheet');

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.total_products', 2);

        $itemA = collect($response->json('data.items'))->firstWhere('product_id', $this->productA->id);
        $this->assertNotNull($itemA);
        $this->assertEquals(10, $itemA['starting_stock']);
        $this->assertEquals(15, $itemA['restocked_quantity']);
        $this->assertEquals(25, $itemA['expected_stock']);
    }

    public function test_can_submit_audit_and_reconcile_sales_and_stock(): void
    {
        // Starting stock: 10. Restock: 15. Total available: 25.
        StockMovement::create([
            'product_id' => $this->productA->id,
            'type' => 'restock',
            'quantity_change' => 15,
        ]);
        $this->productA->update(['stock_quantity' => 25]);

        // Shelf physical count at end of week: 8 packs remaining
        // Calculated sold: 25 - 8 = 17 packs sold
        // Revenue: 17 * 16.00 = 272.00. Gross profit: 17 * (16 - 12) = 68.00.
        $payload = [
            'notes' => 'Week 36 Sunday shelf count',
            'items' => [
                [
                    'product_id' => $this->productA->id,
                    'physical_count' => 8,
                    'discrepancy_notes' => null,
                ],
                [
                    'product_id' => $this->productB->id,
                    'physical_count' => 15, // 20 - 15 = 5 sold
                    'discrepancy_notes' => null,
                ],
            ],
        ];

        $response = $this->postJson('/api/audits', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.status', 'completed')
            ->assertJsonPath('data.total_items_audited', 2)
            ->assertJsonPath('data.total_units_sold', 22); // 17 + 5 = 22

        // Verify product current stock is reset to counted shelf count
        $this->assertEquals(8, $this->productA->fresh()->stock_quantity);
        $this->assertEquals(15, $this->productB->fresh()->stock_quantity);

        // Verify audit reconciliation stock movement was logged
        $this->assertDatabaseHas('stock_movements', [
            'product_id' => $this->productA->id,
            'type' => 'audit_reconcile',
            'quantity_change' => -17, // 8 - 25 = -17
        ]);
    }
}
