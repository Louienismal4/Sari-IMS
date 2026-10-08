<?php

namespace App\Services;

use App\Models\Product;
use App\Models\StockMovement;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

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
    public function batchStoreProducts(array $items, string $updateMode = 'replace'): array
    {
        $processed = [];

        DB::transaction(function () use ($items, $updateMode, &$processed) {
            foreach ($items as $item) {
                $existing = null;
                $effectiveMode = $item['update_mode'] ?? $updateMode;

                if (!empty($item['id'])) {
                    $existing = Product::lockForUpdate()->find($item['id']);
                } elseif (!empty($item['barcode'])) {
                    $cleanBarcode = trim($item['barcode']);
                    $existing = Product::lockForUpdate()->where('barcode', $cleanBarcode)->first();
                }

                if ($existing) {
                    $previousStock = (int) $existing->stock_quantity;
                    $itemQty = (int) ($item['stock_quantity'] ?? 0);

                    if ($effectiveMode === 'add') {
                        $newStock = $previousStock + $itemQty;
                        $quantityChange = $itemQty;
                    } else {
                        $newStock = $itemQty;
                        $quantityChange = $newStock - $previousStock;
                    }

                    $existing->stock_quantity = $newStock;

                    // Update wholesale cost from receipt
                    if (isset($item['cost_price'])) {
                        $existing->cost_price = $item['cost_price'];
                    }

                    // Backfill barcode if existing barcode is empty
                    if (!empty($item['barcode']) && empty($existing->barcode)) {
                        $existing->barcode = trim($item['barcode']);
                    }

                    // If matched by barcode only (legacy batch store), update attributes if provided.
                    // If matched explicitly by product ID (receipt restock), preserve catalog product's shelf selling price,
                    // name, unit, and category to prevent receipt OCR noise from corrupting catalog records.
                    if (empty($item['id']) && !empty($item['barcode'])) {
                        if (!empty($item['name'])) {
                            $existing->name = $item['name'];
                        }
                        if (isset($item['selling_price'])) {
                            $existing->selling_price = $item['selling_price'];
                        }
                        if (!empty($item['unit'])) {
                            $existing->unit = $item['unit'];
                        }
                        if (isset($item['category_id'])) {
                            $existing->category_id = $item['category_id'];
                        }
                        if (isset($item['reorder_level'])) {
                            $existing->reorder_level = $item['reorder_level'];
                        }
                        if (!empty($item['original_name'])) {
                            $existing->original_name = $item['original_name'];
                        }
                    }

                    $existing->save();

                    if ($quantityChange !== 0) {
                        StockMovement::create([
                            'product_id' => $existing->id,
                            'type' => 'restock',
                            'quantity_change' => $quantityChange,
                            'notes' => 'Restocked via receipt scan',
                            'created_at' => now(),
                        ]);
                    }

                    $processed[] = $existing->load('category');
                    continue;
                }

                $newProductData = $item;
                unset($newProductData['id'], $newProductData['update_mode']);
                $newProduct = Product::create($newProductData);
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
        return DB::transaction(function () use ($product, $data) {
            $product = Product::lockForUpdate()->findOrFail($product->id);

            if (array_key_exists('stock_quantity', $data)) {
                $originalStock = (int) $data['original_stock_quantity'];
                if ((int) $data['stock_quantity'] === $originalStock) {
                    unset($data['stock_quantity']);
                } elseif ($product->stock_quantity !== $originalStock) {
                    throw ValidationException::withMessages([
                        'stock_quantity' => 'Stock changed while this form was open. Refresh the catalog and reopen the product before correcting stock.',
                    ]);
                }
            }

            unset($data['original_stock_quantity']);
            $product->update($data);
            return $product->load('category');
        });
    }

    /**
     * Soft delete a product by deactivating it.
     */
    public function deleteProduct(Product $product): bool
    {
        return $product->update(['is_active' => false]);
    }
}
