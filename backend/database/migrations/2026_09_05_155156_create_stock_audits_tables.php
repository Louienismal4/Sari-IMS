<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Modify stock_movements type enum to include 'audit_reconcile'
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE stock_movements MODIFY COLUMN type ENUM('restock', 'damage', 'expired', 'adjustment', 'sale', 'audit_reconcile') NOT NULL");
        }

        Schema::create('stock_audits', function (Blueprint $table) {
            $table->id();
            $table->string('audit_code')->unique();
            $table->enum('status', ['in_progress', 'completed'])->default('completed');
            $table->timestamp('started_at');
            $table->timestamp('completed_at')->nullable();
            $table->integer('total_items_audited')->default(0);
            $table->integer('total_units_sold')->default(0);
            $table->decimal('total_expected_revenue', 12, 2)->default(0);
            $table->decimal('total_gross_profit', 12, 2)->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('stock_audit_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_audit_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->integer('starting_stock')->default(0);
            $table->integer('restocked_quantity')->default(0);
            $table->integer('physical_count')->default(0);
            $table->integer('units_sold')->default(0);
            $table->decimal('unit_cost', 10, 2)->default(0);
            $table->decimal('unit_price', 10, 2)->default(0);
            $table->decimal('subtotal_revenue', 10, 2)->default(0);
            $table->decimal('subtotal_profit', 10, 2)->default(0);
            $table->string('discrepancy_notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stock_audit_items');
        Schema::dropIfExists('stock_audits');

        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE stock_movements MODIFY COLUMN type ENUM('restock', 'damage', 'expired', 'adjustment', 'sale') NOT NULL");
        }
    }
};
