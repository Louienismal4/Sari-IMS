<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\Sale;
use App\Models\StockMovement;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PosApiTest extends TestCase
{
    use RefreshDatabase;

    private Product $productA;
    private Product $productB;

    protected function setUp(): void
    {
        parent::setUp();

        $category = Category::create(['name' => 'Snacks']);
        $this->productA = Product::create([
            'category_id' => $category->id,
            'barcode' => '480001',
            'name' => 'Chippy Red',
            'unit' => 'pack',
            'cost_price' => 15.00,
            'selling_price' => 20.00,
            'stock_quantity' => 10,
            'reorder_level' => 3,
        ]);

        $this->productB = Product::create([
            'category_id' => $category->id,
            'barcode' => '480002',
            'name' => 'Piattos Green',
            'unit' => 'pack',
            'cost_price' => 18.00,
            'selling_price' => 25.00,
            'stock_quantity' => 5,
            'reorder_level' => 2,
        ]);
    }

    public function test_can_process_cash_checkout_and_deduct_stock(): void
    {
        $payload = [
            'payment_type' => 'cash',
            'amount_tendered' => 100.00,
            'items' => [
                ['product_id' => $this->productA->id, 'quantity' => 2], // 2 * 20 = 40
                ['product_id' => $this->productB->id, 'quantity' => 1], // 1 * 25 = 25 -> Total: 65
            ],
        ];

        $response = $this->postJson('/api/pos/checkout', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.payment_type', 'cash')
            ->assertJsonPath('data.payment_status', 'paid')
            ->assertJsonPath('data.total_amount', 65)
            ->assertJsonPath('data.amount_tendered', 100)
            ->assertJsonPath('data.change_amount', 35);

        // Verify stock deducted
        $this->assertEquals(8, $this->productA->fresh()->stock_quantity);
        $this->assertEquals(4, $this->productB->fresh()->stock_quantity);

        // Verify stock movement ledger
        $this->assertDatabaseHas('stock_movements', [
            'product_id' => $this->productA->id,
            'type' => 'sale',
            'quantity_change' => -2,
        ]);
    }

    public function test_rejects_cash_sale_if_amount_tendered_is_insufficient(): void
    {
        $payload = [
            'payment_type' => 'cash',
            'amount_tendered' => 30.00,
            'items' => [
                ['product_id' => $this->productA->id, 'quantity' => 2], // Total: 40
            ],
        ];

        $response = $this->postJson('/api/pos/checkout', $payload);
        $response->assertStatus(422);
    }

    public function test_can_log_owed_sale_utang_and_settle_it(): void
    {
        // 1. Create credit / utang sale
        $payload = [
            'payment_type' => 'credit',
            'customer_name' => 'Mang Juan',
            'customer_phone' => '09123456789',
            'notes' => 'Bayaran sa sweldo sa Biyernes',
            'items' => [
                ['product_id' => $this->productA->id, 'quantity' => 3], // 3 * 20 = 60
            ],
        ];

        $response = $this->postJson('/api/pos/checkout', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.payment_type', 'credit')
            ->assertJsonPath('data.payment_status', 'unpaid')
            ->assertJsonPath('data.customer_name', 'Mang Juan')
            ->assertJsonPath('data.total_amount', 60);

        $saleId = $response->json('data.id');

        // Verify stock deducted
        $this->assertEquals(7, $this->productA->fresh()->stock_quantity);

        // 2. Fetch debts list
        $debtsResponse = $this->getJson('/api/pos/debts?status=unpaid');
        $debtsResponse->assertStatus(200)
            ->assertJsonFragment(['customer_name' => 'Mang Juan']);

        // 3. Settle debt
        $settleResponse = $this->postJson("/api/pos/debts/{$saleId}/settle", [
            'notes' => 'Nagbayad ng buo via cash',
        ]);

        $settleResponse->assertStatus(200)
            ->assertJsonPath('data.payment_status', 'paid');

        $this->assertEquals('paid', Sale::find($saleId)->payment_status);
        $this->assertNotNull(Sale::find($saleId)->settled_at);
    }

    public function test_fails_checkout_if_insufficient_stock(): void
    {
        $payload = [
            'payment_type' => 'cash',
            'amount_tendered' => 500.00,
            'items' => [
                ['product_id' => $this->productB->id, 'quantity' => 10], // Product B only has 5
            ],
        ];

        $response = $this->postJson('/api/pos/checkout', $payload);
        $response->assertStatus(422)
            ->assertJsonFragment(['message' => "Insufficient stock for 'Piattos Green'. Available: 5, requested: 10."]);
    }
}
