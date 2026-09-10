<?php

use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\DatabaseController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ReceiptScanController;
use App\Http\Controllers\Api\SetupController;
use App\Http\Controllers\Api\StockMovementController;
use Illuminate\Support\Facades\Route;

// Health & Readiness check
Route::get('/health', [SetupController::class, 'health']);
Route::get('/health/ready', [SetupController::class, 'ready']);

Route::middleware('throttle:120,1')->group(function () {
    // Installation & Setup State Machine Endpoints
    Route::get('/installation/status', [SetupController::class, 'status']);
    Route::post('/setup/test-db', [SetupController::class, 'testDatabase'])
        ->middleware('throttle:15,1');
    Route::post('/setup/test-redis', [SetupController::class, 'testRedis'])
        ->middleware('throttle:15,1');
    Route::post('/setup/test-integration', [SetupController::class, 'testIntegration'])
        ->middleware('throttle:15,1');
    Route::post('/setup/complete', [SetupController::class, 'complete'])
        ->middleware('throttle:10,1');

    // Backward-compatible Onboarding aliases
    Route::get('/onboarding/status', [SetupController::class, 'status']);
    Route::post('/onboarding/test-db', [SetupController::class, 'testDatabase'])
        ->middleware('throttle:15,1');
    Route::post('/onboarding/test-gemini', [SetupController::class, 'testIntegration'])
        ->middleware('throttle:15,1');
    Route::post('/onboarding/setup', [SetupController::class, 'complete'])
        ->middleware('throttle:10,1');

    // Categories
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::post('/categories', [CategoryController::class, 'store']);
    Route::put('/categories/{category}', [CategoryController::class, 'update']);
    Route::delete('/categories/{category}', [CategoryController::class, 'destroy']);

    // Products
    Route::get('/products', [ProductController::class, 'index']);
    Route::post('/products', [ProductController::class, 'store']);
    Route::post('/products/batch', [ProductController::class, 'batchStore']);
    Route::get('/products/{product}', [ProductController::class, 'show']);
    Route::put('/products/{product}', [ProductController::class, 'update']);
    Route::delete('/products/{product}', [ProductController::class, 'destroy']);

    // Stock Movements
    Route::get('/stock-movements', [StockMovementController::class, 'index']);
    Route::post('/stock-movements', [StockMovementController::class, 'store']);

    // Receipt OCR & Quota (Strict rate limit on AI scans)
    Route::get('/scan-quota', [ReceiptScanController::class, 'quota']);
    Route::post('/scan-receipt', [ReceiptScanController::class, 'scan'])
        ->middleware('throttle:15,1');

    // POS & Debt ("Utang") Operations
    Route::post('/pos/checkout', [\App\Http\Controllers\Api\PosController::class, 'checkout']);
    Route::get('/pos/sales', [\App\Http\Controllers\Api\PosController::class, 'sales']);
    Route::get('/pos/debts', [\App\Http\Controllers\Api\PosController::class, 'debts']);
    Route::post('/pos/debts/{sale}/settle', [\App\Http\Controllers\Api\PosController::class, 'settleDebt']);

    // Weekly Stock Audits & Reconciliation
    Route::get('/audits/sheet', [\App\Http\Controllers\Api\StockAuditController::class, 'sheet']);
    Route::post('/audits', [\App\Http\Controllers\Api\StockAuditController::class, 'store']);
    Route::get('/audits', [\App\Http\Controllers\Api\StockAuditController::class, 'index']);
    Route::get('/audits/{id}', [\App\Http\Controllers\Api\StockAuditController::class, 'show']);

    // Database Admin Maintenance
    Route::post('/database/reset', [DatabaseController::class, 'reset'])
        ->middleware('throttle:5,1');

    // Full Instance Backup & Restore
    Route::get('/backup/export', [\App\Http\Controllers\Api\BackupController::class, 'export']);
    Route::post('/backup/restore', [\App\Http\Controllers\Api\BackupController::class, 'restore'])
        ->middleware('throttle:10,1');
});