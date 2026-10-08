<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\StockAudit;
use App\Models\StockAuditItem;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class BackupApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAs(User::factory()->create(), 'sanctum');
    }

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
            'stock_movements' => [],
            'stock_audits' => [],
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

    private function seedStore(): array
    {
        $category = Category::create(['name' => 'Keep category']);
        $product = Product::create(['name' => 'Keep product', 'category_id' => $category->id,
            'barcode' => 'KEEP', 'cost_price' => 10, 'selling_price' => 12, 'stock_quantity' => 5]);
        $sale = Sale::create(['invoice_number' => 'KEEP-SALE', 'payment_type' => 'cash',
            'payment_status' => 'paid', 'total_amount' => 12]);
        SaleItem::create(['sale_id' => $sale->id, 'product_id' => $product->id,
            'product_name' => $product->name, 'unit' => 'pc', 'unit_price' => 12,
            'cost_price' => 10, 'quantity' => 1, 'subtotal' => 12]);
        StockMovement::create(['product_id' => $product->id, 'type' => 'sale', 'quantity_change' => -1]);
        $audit = StockAudit::create(['audit_code' => 'KEEP-AUDIT', 'status' => 'completed',
            'started_at' => now(), 'completed_at' => now()]);
        StockAuditItem::create(['stock_audit_id' => $audit->id, 'product_id' => $product->id]);

        return $this->getJson('/api/backup/export')->assertOk()->json();
    }

    private function storeRecords(): array
    {
        $records = [];
        foreach (['categories', 'products', 'sales', 'sale_items', 'stock_movements',
            'stock_audits', 'stock_audit_items'] as $table) {
            $records[$table] = DB::table($table)->orderBy('id')->get()->toJson();
        }

        return $records;
    }

    public function test_invalid_backups_leave_every_store_record_unchanged(): void
    {
        $this->withoutMiddleware(ThrottleRequests::class);
        $valid = $this->seedStore();
        $before = $this->storeRecords();
        $invalid = [['hello' => 'world'], [], '{invalid json', '42'];
        foreach ([
            ['format', 'other'], ['version', '2.0'], ['products', null], ['sales', 'bad'],
            ['categories.0.name', '   '], ['products.0', 'bad'],
            ['products.0.cost_price', 'bad'], ['products.0.stock_quantity', 1.5],
            ['products.0.category_id', 999], ['products.0.barcode', ['bad']],
            ['sales.0.payment_type', 'bitcoin'], ['sales.0.items.0.quantity', 0],
            ['sales.0.items.0.product_id', 999], ['sales.0.items', 'bad'],
            ['stock_movements.0.product_id', 999], ['stock_movements.0.type', 'bad'],
            ['stock_audits.0.items.0.product_id', 999], ['stock_audits.0.started_at', 'bad'],
            ['stock_audits.0.items.0.unit_cost', 'bad'],
        ] as [$path, $value]) {
            $backup = $valid;
            data_set($backup, $path, $value);
            $invalid[] = $backup;
        }
        $missing = $valid;
        unset($missing['stock_movements']);
        $invalid[] = $missing;
        foreach (['categories', 'products', 'sales', 'stock_audits'] as $section) {
            $duplicate = $valid;
            $duplicate[$section][] = $duplicate[$section][0];
            $invalid[] = $duplicate;
        }
        $invalid[] = [['name' => 'Bad legacy product']];

        foreach ($invalid as $backup) {
            $this->postJson('/api/backup/restore', ['backup_data' => $backup])
                ->assertUnprocessable();
            $this->assertSame($before, $this->storeRecords());
        }
    }

    public function test_exported_backup_restores_all_sections_and_references(): void
    {
        $backup = $this->seedStore();
        $this->postJson('/api/backup/restore', ['backup_data' => $backup])
            ->assertOk()->assertJsonPath('data.products_restored', 1)
            ->assertJsonPath('data.sales_restored', 1)->assertJsonPath('data.audits_restored', 1);

        $product = Product::sole();
        $this->assertSame(Category::sole()->id, $product->category_id);
        $this->assertSame($product->id, SaleItem::sole()->product_id);
        $this->assertSame($product->id, StockAuditItem::sole()->product_id);
        $this->assertSame($product->id, StockMovement::sole()->product_id);
        $this->assertSame(Sale::sole()->id, SaleItem::sole()->sale_id);
        $this->assertSame(StockAudit::sole()->id, StockAuditItem::sole()->stock_audit_id);
    }

    public function test_explicit_empty_full_backup_clears_store_records(): void
    {
        $backup = $this->seedStore();
        foreach (['categories', 'products', 'sales', 'stock_movements', 'stock_audits'] as $section) {
            $backup[$section] = [];
        }
        $this->postJson('/api/backup/restore', ['backup_data' => $backup])->assertOk();
        foreach (array_keys($this->storeRecords()) as $table) {
            $this->assertDatabaseEmpty($table);
        }
    }

    public function test_nullable_category_and_historical_sale_references_are_supported(): void
    {
        $backup = $this->seedStore();
        $backup['products'][0]['category_id'] = null;
        $backup['products'][0]['category_name'] = null;
        $backup['sales'][0]['items'][0]['product_id'] = null;
        $this->postJson('/api/backup/restore', ['backup_data' => json_encode($backup), 'mode' => null])
            ->assertOk();
        $this->assertNull(Product::sole()->category_id);
        $this->assertNull(SaleItem::sole()->product_id);
    }

    public function test_legacy_category_name_and_invalid_merge_input(): void
    {
        $this->seedStore();
        $before = $this->storeRecords();
        $this->postJson('/api/backup/restore', ['backup_data' => ['unrelated' => true], 'mode' => 'merge'])
            ->assertUnprocessable()->assertJsonStructure(['message', 'errors']);
        $this->assertSame($before, $this->storeRecords());

        $this->postJson('/api/backup/restore', ['backup_data' => [
            ['name' => 'Legacy', 'category_name' => 'Legacy category', 'cost_price' => '2.50',
                'selling_price' => '3.00', 'stock_quantity' => 4],
        ]])->assertOk();
        $this->assertDatabaseHas('products', ['name' => 'Legacy', 'unit' => 'pc']);
        $this->assertSame(Category::sole()->id, Product::sole()->category_id);
    }

    public function test_conflicting_and_normalized_duplicate_identities_are_rejected(): void
    {
        $this->withoutMiddleware(ThrottleRequests::class);
        $backup = $this->seedStore();
        $before = $this->storeRecords();
        $duplicateBarcode = $backup;
        $duplicateBarcode['products'][] = [...$backup['products'][0], 'id' => 999, 'barcode' => ' KEEP '];
        $duplicateCategory = $backup;
        $duplicateCategory['categories'][] = ['id' => 999, 'name' => ' Keep category '];
        $conflicting = $backup;
        $conflicting['categories'][] = ['id' => 999, 'name' => 'Other category'];
        $conflicting['products'][0]['category_name'] = 'Other category';
        $nestedConflict = $backup;
        $nestedConflict['categories'][] = ['id' => 999, 'name' => 'Other category'];
        $nestedConflict['products'][0]['category'] = ['name' => 'Other category'];
        foreach ([$duplicateBarcode, $duplicateCategory, $conflicting, $nestedConflict] as $invalid) {
            $this->postJson('/api/backup/restore', ['backup_data' => json_encode($invalid)])
                ->assertUnprocessable();
            $this->assertSame($before, $this->storeRecords());
        }
    }

    public function test_zero_names_and_barcode_restore_as_real_records(): void
    {
        $legacy = [['name' => '0', 'category_name' => '0', 'barcode' => '0',
            'cost_price' => 1, 'selling_price' => 2, 'stock_quantity' => 3]];
        $this->postJson('/api/backup/restore', ['backup_data' => $legacy])
            ->assertOk()->assertJsonPath('data.products_restored', 1);
        $this->assertDatabaseHas('categories', ['name' => '0']);
        $this->assertDatabaseHas('products', ['name' => '0', 'barcode' => '0']);
        $backup = $this->getJson('/api/backup/export')->assertOk()->json();
        $this->postJson('/api/backup/restore', ['backup_data' => $backup])
            ->assertOk()->assertJsonPath('data.products_restored', 1);
        $this->assertSame(Category::sole()->id, Product::sole()->category_id);
        $this->assertSame('0', Product::sole()->barcode);
    }

    public function test_restore_failure_rolls_back_deletes_and_inserts(): void
    {
        $backup = $this->seedStore();
        $before = $this->storeRecords();
        $dispatcher = Product::getEventDispatcher();
        Product::setEventDispatcher(clone $dispatcher);
        Product::created(function () {
            throw new \RuntimeException('Simulated restore failure');
        });
        try {
            $this->postJson('/api/backup/restore', ['backup_data' => $backup])
                ->assertStatus(500)->assertJsonPath('status', 'error');
        } finally {
            Product::setEventDispatcher($dispatcher);
        }
        $this->assertSame($before, $this->storeRecords());
        $this->assertSame(1, (int) DB::selectOne('PRAGMA foreign_keys')->foreign_keys);
    }
}
