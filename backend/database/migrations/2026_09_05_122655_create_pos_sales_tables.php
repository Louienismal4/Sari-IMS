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
        // Modify stock_movements type enum to include 'sale'
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE stock_movements MODIFY COLUMN type ENUM('restock', 'damage', 'expired', 'adjustment', 'sale') NOT NULL");
        }

        Schema::create('sales', function (Blueprint $table) {
            $table->id();
            $table->string('invoice_number')->unique();
            $table->string('customer_name')->nullable()->index();
            $table->string('customer_phone')->nullable();
            $table->enum('payment_type', ['cash', 'credit'])->default('cash');
            $table->enum('payment_status', ['paid', 'unpaid'])->default('paid');
            $table->decimal('total_amount', 10, 2);
            $table->decimal('amount_tendered', 10, 2)->default(0);
            $table->decimal('change_amount', 10, 2)->default(0);
            $table->text('notes')->nullable();
            $table->timestamp('settled_at')->nullable();
            $table->timestamps();
        });

        Schema::create('sale_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->string('product_name');
            $table->string('unit')->default('pc');
            $table->decimal('unit_price', 10, 2);
            $table->decimal('cost_price', 10, 2)->default(0);
            $table->integer('quantity');
            $table->decimal('subtotal', 10, 2);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sale_items');
        Schema::dropIfExists('sales');

        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE stock_movements MODIFY COLUMN type ENUM('restock', 'damage', 'expired', 'adjustment') NOT NULL");
        }
    }
};
