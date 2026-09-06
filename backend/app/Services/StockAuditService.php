<?php

namespace App\Services;

use App\Models\Product;
use App\Models\StockAudit;
use App\Models\StockAuditItem;
use App\Models\StockMovement;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class StockAuditService
{
    /**
     * Generate the live audit sheet for physical counting.
     * Pre-calculates starting_stock and any restocks logged since the last audit.
     */
    public function getAuditSheet(): array
    {
        $lastCompletedAudit = StockAudit::where('status', 'completed')
            ->latest('completed_at')
            ->first();

        $lastAuditDate = $lastCompletedAudit?->completed_at;

        // Active products with category
        $products = Product::with('category')
            ->active()
            ->orderBy('name')
            ->get();

        $sheetItems = [];

        foreach ($products as $product) {
            // Find last audit item for this product to get baseline starting stock
            $lastAuditItem = null;
            if ($lastCompletedAudit) {
                $lastAuditItem = StockAuditItem::where('stock_audit_id', $lastCompletedAudit->id)
                    ->where('product_id', $product->id)
                    ->first();
            }

            // If a previous audit exists for this product, starting_stock is that physical count;
            // Otherwise, base it on current stock_quantity minus recent restocks, or current stock.
            $restocksQuery = StockMovement::where('product_id', $product->id)
                ->where('type', 'restock');

            if ($lastAuditDate) {
                $restocksQuery->where('created_at', '>', $lastAuditDate);
            }

            $restockedQuantity = (int) $restocksQuery->sum('quantity_change');

            $startingStock = $lastAuditItem
                ? (int) $lastAuditItem->physical_count
                : max(0, (int) $product->stock_quantity - $restockedQuantity);

            $expectedStock = (int) ($startingStock + $restockedQuantity);

            $sheetItems[] = [
                'product_id' => $product->id,
                'name' => $product->name,
                'original_name' => $product->original_name,
                'barcode' => $product->barcode,
                'unit' => $product->unit,
                'category_id' => $product->category_id,
                'category_name' => $product->category?->name ?? 'Uncategorized',
                'cost_price' => (float) $product->cost_price,
                'selling_price' => (float) $product->selling_price,
                'starting_stock' => $startingStock,
                'restocked_quantity' => $restockedQuantity,
                'expected_stock' => $expectedStock,
                'current_stock' => (int) $product->stock_quantity,
                'suggested_physical_count' => (int) $product->stock_quantity,
            ];
        }

        return [
            'last_audit_completed_at' => $lastAuditDate?->toISOString(),
            'last_audit_code' => $lastCompletedAudit?->audit_code,
            'total_products' => count($sheetItems),
            'items' => $sheetItems,
        ];
    }

    /**
     * Submit completed physical audit and reconcile product stocks atomically.
     *
     * @throws InvalidArgumentException
     */
    public function submitAudit(array $data): StockAudit
    {
        return DB::transaction(function () use ($data) {
            $now = now();
            $auditCode = 'AUDIT-' . $now->format('Ymd-His');

            $lastCompletedAudit = StockAudit::where('status', 'completed')
                ->latest('completed_at')
                ->lockForUpdate()
                ->first();

            $lastAuditDate = $lastCompletedAudit?->completed_at;

            $itemsData = $data['items'];
            $totalUnitsSold = 0;
            $totalExpectedRevenue = 0;
            $totalGrossProfit = 0;
            $auditItemsToInsert = [];

            foreach ($itemsData as $entry) {
                $productId = $entry['product_id'];
                $physicalCount = (int) $entry['physical_count'];
                $discrepancyNotes = $entry['discrepancy_notes'] ?? null;

                $product = Product::lockForUpdate()->findOrFail($productId);

                // Determine starting stock
                $lastAuditItem = null;
                if ($lastCompletedAudit) {
                    $lastAuditItem = StockAuditItem::where('stock_audit_id', $lastCompletedAudit->id)
                        ->where('product_id', $product->id)
                        ->first();
                }

                $restocksQuery = StockMovement::where('product_id', $product->id)
                    ->where('type', 'restock');

                if ($lastAuditDate) {
                    $restocksQuery->where('created_at', '>', $lastAuditDate);
                }

                $restockedQuantity = (int) $restocksQuery->sum('quantity_change');
                $startingStock = $lastAuditItem
                    ? (int) $lastAuditItem->physical_count
                    : max(0, (int) $product->stock_quantity - $restockedQuantity);

                $availableToSell = $startingStock + $restockedQuantity;

                // Formula: Sold = Available - Physical Count
                $unitsSold = max(0, $availableToSell - $physicalCount);

                $costPrice = (float) $product->cost_price;
                $sellingPrice = (float) $product->selling_price;
                $subtotalRevenue = $unitsSold * $sellingPrice;
                $subtotalProfit = $unitsSold * ($sellingPrice - $costPrice);

                $totalUnitsSold += $unitsSold;
                $totalExpectedRevenue += $subtotalRevenue;
                $totalGrossProfit += $subtotalProfit;

                $auditItemsToInsert[] = [
                    'product' => $product,
                    'starting_stock' => $startingStock,
                    'restocked_quantity' => $restockedQuantity,
                    'physical_count' => $physicalCount,
                    'units_sold' => $unitsSold,
                    'unit_cost' => $costPrice,
                    'unit_price' => $sellingPrice,
                    'subtotal_revenue' => $subtotalRevenue,
                    'subtotal_profit' => $subtotalProfit,
                    'discrepancy_notes' => $discrepancyNotes,
                ];
            }

            // Create StockAudit header
            $audit = StockAudit::create([
                'audit_code' => $auditCode,
                'status' => 'completed',
                'started_at' => $lastAuditDate ?: $now->copy()->subWeek(),
                'completed_at' => $now,
                'total_items_audited' => count($auditItemsToInsert),
                'total_units_sold' => $totalUnitsSold,
                'total_expected_revenue' => $totalExpectedRevenue,
                'total_gross_profit' => $totalGrossProfit,
                'notes' => $data['notes'] ?? null,
            ]);

            // Save items and reconcile product stock_quantity
            foreach ($auditItemsToInsert as $item) {
                $product = $item['product'];
                $physicalCount = $item['physical_count'];
                $oldStock = $product->stock_quantity;
                $difference = $physicalCount - $oldStock;

                StockAuditItem::create([
                    'stock_audit_id' => $audit->id,
                    'product_id' => $product->id,
                    'starting_stock' => $item['starting_stock'],
                    'restocked_quantity' => $item['restocked_quantity'],
                    'physical_count' => $physicalCount,
                    'units_sold' => $item['units_sold'],
                    'unit_cost' => $item['unit_cost'],
                    'unit_price' => $item['unit_price'],
                    'subtotal_revenue' => $item['subtotal_revenue'],
                    'subtotal_profit' => $item['subtotal_profit'],
                    'discrepancy_notes' => $item['discrepancy_notes'],
                ]);

                // Reset product stock quantity to exact counted physical stock
                $product->update(['stock_quantity' => $physicalCount]);

                // Record audit reconciliation stock movement if there is a change
                if ($difference !== 0) {
                    StockMovement::create([
                        'product_id' => $product->id,
                        'type' => 'audit_reconcile',
                        'quantity_change' => $difference,
                        'notes' => "Weekly audit #{$auditCode} (counted: {$physicalCount}, previous: {$oldStock})",
                        'created_at' => $now,
                    ]);
                }
            }

            return $audit->load(['items.product.category']);
        });
    }

    /**
     * Get past audits history.
     */
    public function getAuditHistory(int $limit = 20): Collection
    {
        return StockAudit::with(['items.product'])
            ->orderBy('completed_at', 'desc')
            ->limit(min(max($limit, 1), 100))
            ->get();
    }

    /**
     * Get single audit report with items and categories.
     */
    public function getAuditDetails(int $id): StockAudit
    {
        return StockAudit::with(['items.product.category'])
            ->findOrFail($id);
    }
}
