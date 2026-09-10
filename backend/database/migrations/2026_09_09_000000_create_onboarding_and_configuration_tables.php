<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Installations state machine
        Schema::create('installations', function (Blueprint $table) {
            $table->id();
            $table->string('status', 32)->default('pending'); // pending, installing, completed, failed
            $table->string('version', 32)->default('1.0.0');
            $table->timestamp('installed_at')->nullable();
            $table->timestamps();
        });

        // 2. Stores business entity
        Schema::create('stores', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('owner_name')->nullable();
            $table->text('address')->nullable();
            $table->string('timezone', 64)->default('Asia/Manila');
            $table->string('currency', 10)->default('PHP');
            $table->string('currency_symbol', 10)->default('₱');
            $table->decimal('target_markup_percentage', 5, 2)->default(20.00);
            $table->integer('default_reorder_level')->default(5);
            $table->json('contact_information')->nullable();
            $table->timestamps();
        });

        // 3. Application Settings
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->text('value')->nullable();
            $table->timestamps();
        });

        // 4. Encrypted Integration Credentials
        Schema::create('integration_credentials', function (Blueprint $table) {
            $table->id();
            $table->string('provider', 64)->index();
            $table->string('key', 64);
            $table->text('encrypted_value');
            $table->timestamps();

            $table->unique(['provider', 'key']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('integration_credentials');
        Schema::dropIfExists('settings');
        Schema::dropIfExists('stores');
        Schema::dropIfExists('installations');
    }
};