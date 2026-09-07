<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\StockAudit;
use App\Models\StockAuditItem;
use App\Models\StockMovement;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class BackupService
{
    /**
     * Export complete database snapshot with metadata.
     */
    public function exportInstanceBackup(?array $storeSettings = null): array
    {
        $categories = Category::all()->map(function ($cat) {
            return [
                'id' => $cat->id,
                'name' => $cat->name,
                'created_at' => $cat->created_at?->toIso8601String(),
            ];
        });

        $products = Product::with('category')->get()->map(function ($prod) {
            return [
                'id' => $prod->id,
                'category_id' => $prod->category_id,
                'category_name' => $prod->category?->name,
                'barcode' => $prod->barcode,
                'name' => $prod->name,
                'original_name' => $prod->original_name,
                'unit' => $prod->unit,
                'cost_price' => (string) $prod->cost_price,
                'selling_price' => (string) $prod->selling_price,
                'stock_quantity' => $prod->stock_quantity,
                'reorder_level' => $prod->reorder_level,
                'is_active' => (bool) $prod->is_active,
                'created_at' => $prod->created_at?->toIso8601String(),
            ];
        });

        $sales = Sale::with('items')->get()->map(function ($sale) {
            return [
                'id' => $sale->id,
                'invoice_number' => $sale->invoice_number,
                'customer_name' => $sale->customer_name,
                'customer_phone' => $sale->customer_phone,
                'payment_type' => $sale->payment_type,
                'payment_status' => $sale->payment_status,
                'total_amount' => (string) $sale->total_amount,
                'amount_tendered' => (string) $sale->amount_tendered,
                'change_amount' => (string) $sale->change_amount,
                'notes' => $sale->notes,
                'settled_at' => $sale->settled_at?->toIso8601String(),
                'created_at' => $sale->created_at?->toIso8601String(),
                'items' => $sale->items->map(function ($item) {
                    return [
                        'product_id' => $item->product_id,
                        'product_name' => $item->product_name,
                        'unit' => $item->unit,
                        'unit_price' => (string) $item->unit_price,
                        'cost_price' => (string) $item->cost_price,
                        'quantity' => $item->quantity,
                        'subtotal' => (string) $item->subtotal,
                    ];
                }),
            ];
        });

        $stockAudits = StockAudit::with('items')->get()->map(function ($audit) {
            return [
                'id' => $audit->id,
                'audit_code' => $audit->audit_code,
                'status' => $audit->status,
                'started_at' => $audit->started_at?->toIso8601String(),
                'completed_at' => $audit->completed_at?->toIso8601String(),
                'total_items_audited' => $audit->total_items_audited,
                'total_units_sold' => $audit->total_units_sold,
                'total_expected_revenue' => (string) $audit->total_expected_revenue,
                'total_gross_profit' => (string) $audit->total_gross_profit,
                'notes' => $audit->notes,
                'items' => $audit->items->map(function ($item) {
                    return [
                        'product_id' => $item->product_id,
                        'starting_stock' => $item->starting_stock,
                        'restocked_quantity' => $item->restocked_quantity,
                        'physical_count' => $item->physical_count,
                        'units_sold' => $item->units_sold,
                        'unit_cost' => (string) $item->unit_cost,
                        'unit_price' => (string) $item->unit_price,
                        'subtotal_revenue' => (string) $item->subtotal_revenue,
                        'subtotal_profit' => (string) $item->subtotal_profit,
                        'discrepancy_notes' => $item->discrepancy_notes,
                    ];
                }),
            ];
        });

        $stockMovements = StockMovement::all()->map(function ($m) {
            return [
                'product_id' => $m->product_id,
                'type' => $m->type,
                'quantity_change' => $m->quantity_change,
                'notes' => $m->notes,
                'created_at' => $m->created_at?->toIso8601String(),
            ];
        });

        return [
            'format' => 'sari_full_instance_backup',
            'version' => '1.0',
            'exported_at' => now()->toIso8601String(),
            'generator' => 'Sari-IMS Instance Backup Engine',
            'store_settings' => $storeSettings,
            'summary' => [
                'categories_count' => $categories->count(),
                'products_count' => $products->count(),
                'sales_count' => $sales->count(),
                'audits_count' => $stockAudits->count(),
                'movements_count' => $stockMovements->count(),
            ],
            'categories' => $categories,
            'products' => $products,
            'sales' => $sales,
            'stock_movements' => $stockMovements,
            'stock_audits' => $stockAudits,
        ];
    }

    /**
     * Restore instance backup with full rollback on error.
     */
    public function restoreInstanceBackup(array $backupData, string $mode = 'full'): array
    {
        return DB::transaction(function () use ($backupData, $mode) {
            Schema::disableForeignKeyConstraints();

            // Detect if legacy array or full instance
            $isLegacyArray = array_is_list($backupData) && count($backupData) > 0 && isset($backupData[0]['name']);
            
            $categoriesData = [];
            $productsData = [];
            $salesData = [];
            $auditsData = [];
            $movementsData = [];
            $storeSettings = null;

            if ($isLegacyArray) {
                // Legacy backup: array of products
                $productsData = $backupData;
                $catNames = [];
                foreach ($productsData as $p) {
                    $catName = $p['category']['name'] ?? $p['category_name'] ?? null;
                    if ($catName && !in_array($catName, $catNames)) {
                        $catNames[] = $catName;
                    }
                }
                foreach ($catNames as $name) {
                    $categoriesData[] = ['name' => $name];
                }
            } else {
                $categoriesData = $backupData['categories'] ?? [];
                $productsData = $backupData['products'] ?? [];
                $salesData = $backupData['sales'] ?? [];
                $auditsData = $backupData['stock_audits'] ?? [];
                $movementsData = $backupData['stock_movements'] ?? [];
                $storeSettings = $backupData['store_settings'] ?? null;
            }

            if ($mode === 'full') {
                StockAuditItem::truncate();
                StockAudit::truncate();
                SaleItem::truncate();
                Sale::truncate();
                StockMovement::truncate();
                Product::truncate();
                Category::truncate();
            }

            // 1. Restore categories
            $categoryIdMap = [];
            $categoryNameMap = [];

            foreach ($categoriesData as $catItem) {
                $name = trim($catItem['name'] ?? '');
                if (!$name) continue;

                $cat = Category::firstOrCreate(['name' => $name]);
                $categoryNameMap[strtolower($name)] = $cat->id;
                if (isset($catItem['id'])) {
                    $categoryIdMap[$catItem['id']] = $cat->id;
                }
            }

            // 2. Restore products
            $productIdMap = [];
            $restoredProductsCount = 0;

            foreach ($productsData as $prodItem) {
                $name = trim($prodItem['name'] ?? '');
                if (!$name) continue;

                $targetCatId = null;
                if (!empty($prodItem['category_id']) && isset($categoryIdMap[$prodItem['category_id']])) {
                    $targetCatId = $categoryIdMap[$prodItem['category_id']];
                } elseif (!empty($prodItem['category_name']) && isset($categoryNameMap[strtolower(trim($prodItem['category_name']))])) {
                    $targetCatId = $categoryNameMap[strtolower(trim($prodItem['category_name']))];
                } elseif (!empty($prodItem['category']['name']) && isset($categoryNameMap[strtolower(trim($prodItem['category']['name']))])) {
                    $targetCatId = $categoryNameMap[strtolower(trim($prodItem['category']['name']))];
                }

                $barcode = !empty($prodItem['barcode']) ? trim($prodItem['barcode']) : null;

                $product = null;
                if ($barcode) {
                    $product = Product::where('barcode', $barcode)->first();
                }

                $productAttrs = [
                    'category_id' => $targetCatId,
                    'barcode' => $barcode,
                    'name' => $name,
                    'original_name' => $prodItem['original_name'] ?? null,
                    'unit' => $prodItem['unit'] ?? 'pc',
                    'cost_price' => $prodItem['cost_price'] ?? 0,
                    'selling_price' => $prodItem['selling_price'] ?? 0,
                    'stock_quantity' => $prodItem['stock_quantity'] ?? 0,
                    'reorder_level' => $prodItem['reorder_level'] ?? 5,
                    'is_active' => $prodItem['is_active'] ?? true,
                ];

                if ($product) {
                    $product->update($productAttrs);
                } else {
                    $product = Product::create($productAttrs);
                }

                if (isset($prodItem['id'])) {
                    $productIdMap[$prodItem['id']] = $product->id;
                }
                $restoredProductsCount++;
            }

            // 3. Restore sales & items
            $restoredSalesCount = 0;
            foreach ($salesData as $saleItem) {
                $invoiceNumber = $saleItem['invoice_number'] ?? ('INV-' . uniqid());
                
                $sale = Sale::firstOrCreate(
                    ['invoice_number' => $invoiceNumber],
                    [
                        'customer_name' => $saleItem['customer_name'] ?? null,
                        'customer_phone' => $saleItem['customer_phone'] ?? null,
                        'payment_type' => $saleItem['payment_type'] ?? 'cash',
                        'payment_status' => $saleItem['payment_status'] ?? 'paid',
                        'total_amount' => $saleItem['total_amount'] ?? 0,
                        'amount_tendered' => $saleItem['amount_tendered'] ?? 0,
                        'change_amount' => $saleItem['change_amount'] ?? 0,
                        'notes' => $saleItem['notes'] ?? null,
                        'settled_at' => $saleItem['settled_at'] ?? null,
                    ]
                );

                if (!empty($saleItem['items'])) {
                    foreach ($saleItem['items'] as $item) {
                        $pId = null;
                        if (!empty($item['product_id']) && isset($productIdMap[$item['product_id']])) {
                            $pId = $productIdMap[$item['product_id']];
                        }

                        SaleItem::create([
                            'sale_id' => $sale->id,
                            'product_id' => $pId,
                            'product_name' => $item['product_name'] ?? 'Item',
                            'unit' => $item['unit'] ?? 'pc',
                            'unit_price' => $item['unit_price'] ?? 0,
                            'cost_price' => $item['cost_price'] ?? 0,
                            'quantity' => $item['quantity'] ?? 1,
                            'subtotal' => $item['subtotal'] ?? 0,
                        ]);
                    }
                }
                $restoredSalesCount++;
            }

            // 4. Restore audits & items
            $restoredAuditsCount = 0;
            foreach ($auditsData as $auditItem) {
                $auditCode = $auditItem['audit_code'] ?? ('AUDIT-' . uniqid());
                $audit = StockAudit::firstOrCreate(
                    ['audit_code' => $auditCode],
                    [
                        'status' => $auditItem['status'] ?? 'completed',
                        'started_at' => $auditItem['started_at'] ?? now(),
                        'completed_at' => $auditItem['completed_at'] ?? now(),
                        'total_items_audited' => $auditItem['total_items_audited'] ?? 0,
                        'total_units_sold' => $auditItem['total_units_sold'] ?? 0,
                        'total_expected_revenue' => $auditItem['total_expected_revenue'] ?? 0,
                        'total_gross_profit' => $auditItem['total_gross_profit'] ?? 0,
                        'notes' => $auditItem['notes'] ?? null,
                    ]
                );

                if (!empty($auditItem['items'])) {
                    foreach ($auditItem['items'] as $item) {
                        $pId = null;
                        if (!empty($item['product_id']) && isset($productIdMap[$item['product_id']])) {
                            $pId = $productIdMap[$item['product_id']];
                        }
                        if (!$pId) continue;

                        StockAuditItem::create([
                            'stock_audit_id' => $audit->id,
                            'product_id' => $pId,
                            'starting_stock' => $item['starting_stock'] ?? 0,
                            'restocked_quantity' => $item['restocked_quantity'] ?? 0,
                            'physical_count' => $item['physical_count'] ?? 0,
                            'units_sold' => $item['units_sold'] ?? 0,
                            'unit_cost' => $item['unit_cost'] ?? 0,
                            'unit_price' => $item['unit_price'] ?? 0,
                            'subtotal_revenue' => $item['subtotal_revenue'] ?? 0,
                            'subtotal_profit' => $item['subtotal_profit'] ?? 0,
                            'discrepancy_notes' => $item['discrepancy_notes'] ?? null,
                        ]);
                    }
                }
                $restoredAuditsCount++;
            }

            // 5. Restore stock movements
            foreach ($movementsData as $mov) {
                $pId = null;
                if (!empty($mov['product_id']) && isset($productIdMap[$mov['product_id']])) {
                    $pId = $productIdMap[$mov['product_id']];
                }
                if ($pId) {
                    StockMovement::create([
                        'product_id' => $pId,
                        'type' => $mov['type'] ?? 'adjustment',
                        'quantity_change' => $mov['quantity_change'] ?? 0,
                        'notes' => $mov['notes'] ?? null,
                        'created_at' => $mov['created_at'] ?? now(),
                    ]);
                }
            }

            Schema::enableForeignKeyConstraints();

            return [
                'categories_restored' => count($categoryIdMap),
                'products_restored' => $restoredProductsCount,
                'sales_restored' => $restoredSalesCount,
                'audits_restored' => $restoredAuditsCount,
                'store_settings' => $storeSettings,
                'mode' => $mode,
            ];
        });
    }
}
