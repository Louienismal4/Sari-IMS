<?php

namespace App\Services;

use App\Models\Product;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class ProductService
{
    /**
     * Retrieve active products filtered by search query and category.
     */
    public function getProducts(?string $search = null, mixed $categoryId = null): Collection
    {
        return Product::with('category')
            ->active()
            ->search($search)
            ->filterByCategory($categoryId)
            ->orderBy('name')
            ->get();
    }

    /**
     * Store a product or update an existing one if barcode matches.
     */
    public function storeProduct(array $data): array
    {
        if (!empty($data['barcode'])) {
            $existing = Product::where('barcode', $data['barcode'])->first();
            if ($existing) {
                $existing->update($data);
                return [
                    'product' => $existing->load('category'),
                    'was_updated' => true,
                ];
            }
        }

        $product = Product::create($data);

        return [
            'product' => $product->load('category'),
            'was_updated' => false,
        ];
    }

    /**
     * Batch store/upsert products inside a single database transaction.
     */
    public function batchStoreProducts(array $items): array
    {
        $processed = [];

        DB::transaction(function () use ($items, &$processed) {
            foreach ($items as $item) {
                if (!empty($item['barcode'])) {
                    $existing = Product::where('barcode', $item['barcode'])->first();
                    if ($existing) {
                        $existing->stock_quantity += ($item['stock_quantity'] ?? 1);
                        $existing->cost_price = $item['cost_price'];
                        $existing->selling_price = $item['selling_price'];
                        if (!empty($item['original_name']) && empty($existing->original_name)) {
                            $existing->original_name = $item['original_name'];
                        }
                        $existing->save();
                        $processed[] = $existing->load('category');
                        continue;
                    }
                }
                $newProduct = Product::create($item);
                $processed[] = $newProduct->load('category');
            }
        });

        return $processed;
    }

    /**
     * Update an existing product.
     */
    public function updateProduct(Product $product, array $data): Product
    {
        $product->update($data);
        return $product->load('category');
    }

    /**
     * Soft delete a product by deactivating it.
     */
    public function deleteProduct(Product $product): bool
    {
        return $product->update(['is_active' => false]);
    }
}
