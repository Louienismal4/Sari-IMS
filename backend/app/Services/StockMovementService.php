<?php

namespace App\Services;

use App\Models\Product;
use App\Models\StockMovement;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class StockMovementService
{
    /**
     * Get recent stock movements with associated products and categories.
     */
    public function getStockMovements(int $limit = 20): Collection
    {
        $safeLimit = min(max($limit, 1), 100);

        return StockMovement::with('product.category')
            ->orderBy('created_at', 'desc')
            ->limit($safeLimit)
            ->get();
    }

    /**
     * Record a stock movement with pessimistic locking and transactional safety.
     *
     * @throws InvalidArgumentException
     */
    public function recordStockMovement(array $data): StockMovement
    {
        return DB::transaction(function () use ($data) {
            $product = Product::lockForUpdate()->findOrFail($data['product_id']);

            $newStock = $product->stock_quantity + $data['quantity_change'];
            if ($newStock < 0) {
                throw new InvalidArgumentException('Stock quantity cannot drop below zero.');
            }

            $product->update(['stock_quantity' => $newStock]);

            return StockMovement::create([
                'product_id' => $data['product_id'],
                'type' => $data['type'],
                'quantity_change' => $data['quantity_change'],
                'notes' => $data['notes'] ?? null,
                'created_at' => now(),
            ])->load('product.category');
        });
    }
}
