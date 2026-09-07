<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BackupApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_export_full_instance_backup(): void
    {
        $cat = Category::create(['name' => 'Snacks & Biscuits']);
        Product::create([
            'category_id' => $cat->id,
            'barcode' => '4800016644002',
            'name' => 'SkyFlakes 250g',
            'unit' => 'pack',
            'cost_price' => 35.00,
            'selling_price' => 45.00,
            'stock_quantity' => 15,
            'reorder_level' => 5,
        ]);

        $sale = Sale::create([
            'invoice_number' => 'INV-TEST-001',
            'customer_name' => 'Aling Maria',
            'payment_type' => 'cash',
            'payment_status' => 'paid',
            'total_amount' => 45.00,
            'amount_tendered' => 50.00,
            'change_amount' => 5.00,
        ]);

        SaleItem::create([
            'sale_id' => $sale->id,
            'product_name' => 'SkyFlakes 250g',
            'unit' => 'pack',
            'unit_price' => 45.00,
            'cost_price' => 35.00,
            'quantity' => 1,
            'subtotal' => 45.00,
        ]);

        $response = $this->getJson('/api/backup/export');

        $response->assertStatus(200)
            ->assertJsonPath('format', 'sari_full_instance_backup')
            ->assertJsonPath('version', '1.0')
            ->assertJsonPath('summary.categories_count', 1)
            ->assertJsonPath('summary.products_count', 1)
            ->assertJsonPath('summary.sales_count', 1)
            ->assertJsonFragment(['name' => 'SkyFlakes 250g'])
            ->assertJsonFragment(['name' => 'Snacks & Biscuits']);
    }

    public function test_can_restore_full_instance_backup(): void
    {
        $snapshot = [
            'format' => 'sari_full_instance_backup',
            'version' => '1.0',
            'store_settings' => [
                'store_name' => 'Restored Test Store',
                'owner_name' => 'Mang Pedro',
            ],
            'categories' => [
                ['id' => 99, 'name' => 'Canned Goods'],
            ],
            'products' => [
                [
                    'id' => 101,
                    'category_id' => 99,
                    'barcode' => '7890123456789',
                    'name' => 'Purefoods Corned Beef 150g',
                    'unit' => 'can',
                    'cost_price' => 55.00,
                    'selling_price' => 65.00,
                    'stock_quantity' => 30,
                    'reorder_level' => 8,
                ],
            ],
            'sales' => [
                [
                    'invoice_number' => 'INV-RESTORE-001',
                    'customer_name' => 'Mang Jose',
                    'payment_type' => 'credit',
                    'payment_status' => 'unpaid',
                    'total_amount' => 130.00,
                    'items' => [
                        [
                            'product_id' => 101,
                            'product_name' => 'Purefoods Corned Beef 150g',
                            'unit' => 'can',
                            'unit_price' => 65.00,
                            'cost_price' => 55.00,
                            'quantity' => 2,
                            'subtotal' => 130.00,
                        ],
                    ],
                ],
            ],
        ];

        $response = $this->postJson('/api/backup/restore', [
            'backup_data' => $snapshot,
            'mode' => 'full',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.products_restored', 1)
            ->assertJsonPath('data.categories_restored', 1)
            ->assertJsonPath('data.sales_restored', 1);

        $this->assertDatabaseHas('categories', ['name' => 'Canned Goods']);
        $this->assertDatabaseHas('products', [
            'name' => 'Purefoods Corned Beef 150g',
            'barcode' => '7890123456789',
            'stock_quantity' => 30,
            'selling_price' => 65.00,
        ]);
        $this->assertDatabaseHas('sales', [
            'invoice_number' => 'INV-RESTORE-001',
            'customer_name' => 'Mang Jose',
            'payment_status' => 'unpaid',
        ]);
    }

    public function test_can_restore_legacy_product_backup(): void
    {
        $legacyProducts = [
            [
                'id' => 1,
                'name' => 'Bear Brand 33g',
                'barcode' => '4800361376511',
                'unit' => 'sachet',
                'cost_price' => 14.50,
                'selling_price' => 18.00,
                'stock_quantity' => 50,
                'reorder_level' => 10,
                'category' => ['name' => 'Dairy & Milk'],
            ],
        ];

        $response = $this->postJson('/api/backup/restore', [
            'backup_data' => $legacyProducts,
            'mode' => 'full',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.products_restored', 1);

        $this->assertDatabaseHas('categories', ['name' => 'Dairy & Milk']);
        $this->assertDatabaseHas('products', [
            'name' => 'Bear Brand 33g',
            'barcode' => '4800361376511',
            'stock_quantity' => 50,
        ]);
    }
}
