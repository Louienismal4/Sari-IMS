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
        $this->actingAs(\App\Models\User::factory()->create(), 'sanctum');

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
        $sheet = collect($this->getJson('/api/audits/sheet')->assertOk()->json('data.items'))->keyBy('product_id');
        $payload = [
            'notes' => 'Week 36 Sunday shelf count',
            'items' => [
                [
                    'product_id' => $this->productA->id,
                    'original_stock' => $sheet[$this->productA->id]['current_stock'],
                    'stock_revision' => $sheet[$this->productA->id]['stock_revision'],
                    'physical_count' => 8,
                    'discrepancy_notes' => null,
                ],
                [
                    'product_id' => $this->productB->id,
                    'original_stock' => $sheet[$this->productB->id]['current_stock'],
                    'stock_revision' => $sheet[$this->productB->id]['stock_revision'],
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

    public function test_stale_audit_preserves_a_pos_sale_and_rejects_every_count(): void
    {
        $sheet = $this->getJson('/api/audits/sheet')->assertOk()->json('data.items');
        $this->postJson('/api/pos/checkout', [
            'payment_type' => 'cash',
            'amount_tendered' => 32,
            'items' => [['product_id' => $this->productA->id, 'quantity' => 2]],
        ])->assertCreated();

        $items = collect($sheet)->reverse()->map(fn ($item) => [
            'product_id' => $item['product_id'],
            'original_stock' => $item['current_stock'],
            'stock_revision' => $item['stock_revision'],
            'physical_count' => 5,
        ])->values()->all();

        $this->postJson('/api/audits', ['items' => $items])->assertStatus(422)
            ->assertJsonPath('message', "Stock changed for '{$this->productA->name}'. Refresh the audit sheet and recount this product before submitting.");

        $this->assertEquals(8, $this->productA->fresh()->stock_quantity);
        $this->assertEquals(20, $this->productB->fresh()->stock_quantity);
        $this->assertDatabaseCount('stock_audits', 0);
        $this->assertDatabaseCount('stock_audit_items', 0);
        $this->assertDatabaseCount('stock_movements', 1);
        $this->assertDatabaseHas('stock_movements', [
            'product_id' => $this->productA->id,
            'type' => 'sale',
            'quantity_change' => -2,
        ]);
    }

    #[\PHPUnit\Framework\Attributes\DataProvider('restockScenarios')]
    public function test_stale_audit_preserves_restock_and_a_refreshed_count_succeeds(bool $sellFirst): void
    {
        $item = collect($this->getJson('/api/audits/sheet')->assertOk()->json('data.items'))
            ->firstWhere('product_id', $this->productA->id);
        $this->assertEquals(10, $item['current_stock']);

        if ($sellFirst) {
            $this->postJson('/api/pos/checkout', [
                'payment_type' => 'cash',
                'amount_tendered' => 32,
                'items' => [['product_id' => $this->productA->id, 'quantity' => 2]],
            ])->assertCreated();
        }
        $this->postJson('/api/stock-movements', [
            'product_id' => $this->productA->id,
            'type' => 'restock',
            'quantity_change' => 2,
        ])->assertCreated();

        $this->postJson('/api/audits', ['items' => [[
            'product_id' => $item['product_id'],
            'original_stock' => $item['current_stock'],
            'stock_revision' => $item['stock_revision'],
            'physical_count' => 5,
        ]]])->assertStatus(422);

        $this->assertEquals($sellFirst ? 10 : 12, $this->productA->fresh()->stock_quantity);
        $this->assertDatabaseCount('stock_audits', 0);
        $this->assertDatabaseCount('stock_audit_items', 0);
        $this->assertDatabaseCount('stock_movements', $sellFirst ? 2 : 1);
        $this->assertDatabaseHas('stock_movements', [
            'product_id' => $this->productA->id,
            'type' => 'restock',
            'quantity_change' => 2,
        ]);

        $freshItem = collect($this->getJson('/api/audits/sheet')->assertOk()->json('data.items'))
            ->firstWhere('product_id', $this->productA->id);
        $this->postJson('/api/audits', ['items' => [[
            'product_id' => $freshItem['product_id'],
            'original_stock' => $freshItem['current_stock'],
            'stock_revision' => $freshItem['stock_revision'],
            'physical_count' => 9,
        ]]])->assertCreated()->assertJsonPath('data.status', 'completed')
            ->assertJsonPath('data.total_items_audited', 1);
        $this->assertEquals(9, $this->productA->fresh()->stock_quantity);
    }

    public static function restockScenarios(): array
    {
        return ['restock' => [false], 'sale and equal restock' => [true]];
    }

    public function test_audit_requires_original_stock_state(): void
    {
        $this->postJson('/api/audits', ['items' => [[
            'product_id' => $this->productA->id,
            'physical_count' => 5,
        ]]])->assertUnprocessable()->assertJsonValidationErrors([
            'items.0.original_stock', 'items.0.stock_revision',
        ]);
        $this->assertEquals(10, $this->productA->fresh()->stock_quantity);
        $this->assertDatabaseCount('stock_audits', 0);
        $this->assertDatabaseCount('stock_movements', 0);
    }

    public function test_manual_stock_changes_back_to_original_still_require_recounting(): void
    {
        $item = collect($this->getJson('/api/audits/sheet')->assertOk()->json('data.items'))
            ->firstWhere('product_id', $this->productA->id);
        $this->productA->update(['stock_quantity' => 8]);
        $this->productA->update(['stock_quantity' => 10]);

        $this->postJson('/api/audits', ['items' => [[
            'product_id' => $item['product_id'],
            'original_stock' => $item['current_stock'],
            'stock_revision' => $item['stock_revision'],
            'physical_count' => 5,
        ]]])->assertUnprocessable();
        $this->assertEquals(10, $this->productA->fresh()->stock_quantity);
        $this->assertDatabaseCount('stock_audits', 0);
        $this->assertDatabaseCount('stock_movements', 0);
    }
}
