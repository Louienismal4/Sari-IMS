<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\StockAudit;
use App\Models\StockAuditItem;
use App\Models\User;
use App\Services\PosService;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use Tests\TestCase;

class BackupSnapshotTest extends TestCase
{
    use DatabaseMigrations;

    protected function beforeRefreshingDatabase(): void
    {
        if (DB::getDriverName() === 'pgsql' && !str_ends_with(DB::getDatabaseName(), '_test')) {
            throw new RuntimeException('PostgreSQL snapshot checks require a disposable database ending in _test.');
        }
    }

    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAs(User::factory()->create(), 'sanctum');
    }

    public function test_export_closes_its_transaction_and_preserves_browser_settings(): void
    {
        $settings = ['store_name' => 'Snapshot store', 'owner_name' => 'Maria'];
        $this->getJson('/api/backup/export?'.http_build_query(['settings' => json_encode($settings)]))
            ->assertOk()
            ->assertJsonPath('format', 'sari_full_instance_backup')
            ->assertJsonPath('version', '1.0')
            ->assertJsonPath('store_settings', $settings);

        $this->assertSame(0, DB::transactionLevel());
        $this->assertFalse(DB::getPdo()->inTransaction());
    }

    public function test_export_rolls_back_after_a_read_failure_and_can_be_retried(): void
    {
        $fail = true;
        DB::listen(function (QueryExecuted $query) use (&$fail) {
            if ($fail && str_contains($query->sql, 'from "products"')) {
                $fail = false;
                throw new RuntimeException('Simulated export read failure');
            }
        });

        $this->getJson('/api/backup/export')->assertStatus(500);
        $this->assertFalse($fail);
        $this->assertSame(0, DB::transactionLevel());
        $this->assertFalse(DB::getPdo()->inTransaction());
        $this->getJson('/api/backup/export')->assertOk();
    }

    public function test_postgresql_export_stays_consistent_when_checkout_commits_between_reads(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            $this->markTestSkipped('Run with PostgreSQL and a disposable DB_DATABASE ending in _test.');
        }

        $category = Category::create(['name' => 'Snacks']);
        $product = Product::create(['category_id' => $category->id, 'name' => 'Chippy',
            'unit' => 'pack', 'cost_price' => 15, 'selling_price' => 20, 'stock_quantity' => 10]);
        $checkout = ['payment_type' => 'cash', 'amount_tendered' => 40,
            'items' => [['product_id' => $product->id, 'quantity' => 2]]];
        app(PosService::class)->processCheckout($checkout);
        $audit = StockAudit::create(['audit_code' => 'AUDIT-SNAPSHOT', 'status' => 'in_progress',
            'started_at' => now()]);
        StockAuditItem::create(['stock_audit_id' => $audit->id, 'product_id' => $product->id,
            'starting_stock' => 8, 'unit_cost' => 15, 'unit_price' => 20]);

        $reader = DB::getDefaultConnection();
        config(['database.connections.backup_writer' => config('database.connections.'.$reader)]);
        $committed = false;
        DB::listen(function (QueryExecuted $query) use (&$committed, $reader, $checkout, $category, $audit) {
            if ($committed || $query->connectionName !== $reader || !str_contains($query->sql, 'from "products"')) {
                return;
            }
            $committed = true;
            DB::setDefaultConnection('backup_writer');
            try {
                DB::transaction(function () use ($checkout, $category, $audit) {
                    app(PosService::class)->processCheckout($checkout);
                    Category::whereKey($category->id)->update(['name' => 'Changed during export']);
                    StockAudit::whereKey($audit->id)->update(['total_units_sold' => 2]);
                    StockAuditItem::where('stock_audit_id', $audit->id)->update(['units_sold' => 2]);
                });
            } finally {
                DB::setDefaultConnection($reader);
                DB::disconnect('backup_writer');
            }
        });

        $this->getJson('/api/backup/export')->assertOk()
            ->assertJsonPath('categories.0.name', 'Snacks')
            ->assertJsonPath('products.0.category_name', 'Snacks')
            ->assertJsonPath('products.0.stock_quantity', 8)
            ->assertJsonPath('summary.sales_count', 1)
            ->assertJsonPath('sales.0.items.0.quantity', 2)
            ->assertJsonPath('summary.movements_count', 1)
            ->assertJsonPath('stock_movements.0.quantity_change', -2)
            ->assertJsonPath('stock_audits.0.total_units_sold', 0)
            ->assertJsonPath('stock_audits.0.items.0.units_sold', 0);
        $this->assertTrue($committed);
        $this->assertSame(0, DB::transactionLevel());
        $this->assertFalse(DB::getPdo()->inTransaction());

        $this->getJson('/api/backup/export')->assertOk()
            ->assertJsonPath('products.0.stock_quantity', 6)
            ->assertJsonPath('products.0.category_name', 'Changed during export')
            ->assertJsonPath('summary.sales_count', 2)
            ->assertJsonPath('summary.movements_count', 2)
            ->assertJsonPath('stock_audits.0.total_units_sold', 2)
            ->assertJsonPath('stock_audits.0.items.0.units_sold', 2);
    }

    public function test_postgresql_export_rejects_an_outer_transaction_without_changing_it(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            $this->markTestSkipped('Requires PostgreSQL transaction isolation.');
        }

        DB::beginTransaction();
        try {
            $this->getJson('/api/backup/export')->assertStatus(500);
            $this->assertSame(1, DB::transactionLevel());
            $this->assertSame('read committed', DB::selectOne('SHOW transaction_isolation')->transaction_isolation);
            $this->assertSame('off', DB::selectOne('SHOW transaction_read_only')->transaction_read_only);
        } finally {
            DB::rollBack();
        }
    }
}
