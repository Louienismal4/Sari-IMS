<?php

use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\DatabaseController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ReceiptScanController;
use App\Http\Controllers\Api\StockMovementController;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json(['status' => 'ok']);
});

Route::middleware('throttle:120,1')->group(function () {
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

    // Database Admin Maintenance
    Route::post('/database/reset', [DatabaseController::class, 'reset'])
        ->middleware('throttle:5,1');
});