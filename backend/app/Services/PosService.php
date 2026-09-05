<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class PosService
{
    public function __construct(
        protected StockMovementService $stockMovementService
    ) {}

    /**
     * Process POS sale checkout (cash or credit).
     *
     * @throws InvalidArgumentException
     */
    public function processCheckout(array $data): Sale
    {
        return DB::transaction(function () use ($data) {
            $paymentType = $data['payment_type'];
            $items = $data['items'];
            $totalAmount = 0;

            // Generate unique invoice number: POS-YYYYMMDD-XXXX
            $datePrefix = 'POS-' . now()->format('Ymd');
            $latestSale = Sale::where('invoice_number', 'like', "{$datePrefix}-%")
                ->latest('id')
                ->lockForUpdate()
                ->first();

            $sequence = 1;
            if ($latestSale && preg_match('/-(\d+)$/', $latestSale->invoice_number, $matches)) {
                $sequence = (int) $matches[1] + 1;
            }
            $invoiceNumber = sprintf('%s-%04d', $datePrefix, $sequence);

            // Pre-validate & lock products
            $preparedItems = [];
            foreach ($items as $itemData) {
                $product = Product::lockForUpdate()->findOrFail($itemData['product_id']);
                $qty = (int) $itemData['quantity'];

                if ($product->stock_quantity < $qty) {
                    throw new InvalidArgumentException(
                        "Insufficient stock for '{$product->name}'. Available: {$product->stock_quantity}, requested: {$qty}."
                    );
                }

                $unitPrice = (float) $product->selling_price;
                $costPrice = (float) $product->cost_price;
                $subtotal = $unitPrice * $qty;
                $totalAmount += $subtotal;

                $preparedItems[] = [
                    'product' => $product,
                    'quantity' => $qty,
                    'unit_price' => $unitPrice,
                    'cost_price' => $costPrice,
                    'subtotal' => $subtotal,
                ];
            }

            // Verify cash tender if cash payment
            $amountTendered = (float) ($data['amount_tendered'] ?? 0);
            $changeAmount = 0;

            if ($paymentType === 'cash') {
                if ($amountTendered < $totalAmount) {
                    throw new InvalidArgumentException(
                        sprintf('Tendered amount (₱%.2f) cannot be less than total (₱%.2f).', $amountTendered, $totalAmount)
                    );
                }
                $changeAmount = $amountTendered - $totalAmount;
            } else {
                // Credit sale (Utang)
                $amountTendered = 0;
                $changeAmount = 0;
            }

            // Create Sale record
            $sale = Sale::create([
                'invoice_number' => $invoiceNumber,
                'customer_name' => $data['customer_name'] ?? null,
                'customer_phone' => $data['customer_phone'] ?? null,
                'payment_type' => $paymentType,
                'payment_status' => $paymentType === 'cash' ? 'paid' : 'unpaid',
                'total_amount' => $totalAmount,
                'amount_tendered' => $amountTendered,
                'change_amount' => $changeAmount,
                'notes' => $data['notes'] ?? null,
                'settled_at' => $paymentType === 'cash' ? now() : null,
            ]);

            // Save items & trigger stock deduction
            foreach ($preparedItems as $prep) {
                $product = $prep['product'];
                $qty = $prep['quantity'];

                SaleItem::create([
                    'sale_id' => $sale->id,
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'unit' => $product->unit,
                    'unit_price' => $prep['unit_price'],
                    'cost_price' => $prep['cost_price'],
                    'quantity' => $qty,
                    'subtotal' => $prep['subtotal'],
                ]);

                // Record stock movement
                $debtorNote = $paymentType === 'credit' && !empty($sale->customer_name)
                    ? " (Utang ni: {$sale->customer_name})"
                    : "";

                $this->stockMovementService->recordStockMovement([
                    'product_id' => $product->id,
                    'type' => 'sale',
                    'quantity_change' => -$qty,
                    'notes' => "POS sale #{$sale->invoice_number}{$debtorNote}",
                ]);
            }

            return $sale->load(['items']);
        });
    }

    /**
     * Get list of credit sales / debts.
     */
    public function getDebts(?string $search = null, ?string $status = null): Collection
    {
        $query = Sale::with('items')
            ->where('payment_type', 'credit')
            ->orderBy('created_at', 'desc');

        if ($status === 'paid') {
            $query->where('payment_status', 'paid');
        } elseif ($status === 'unpaid') {
            $query->where('payment_status', 'unpaid');
        }

        if (!empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('customer_name', 'like', "%{$search}%")
                  ->orWhere('invoice_number', 'like', "%{$search}%")
                  ->orWhere('customer_phone', 'like', "%{$search}%");
            });
        }

        return $query->get();
    }

    /**
     * Settle an unpaid debt.
     *
     * @throws InvalidArgumentException
     */
    public function settleDebt(Sale $sale, ?string $notes = null): Sale
    {
        if ($sale->payment_type !== 'credit') {
            throw new InvalidArgumentException('Only credit sales can be settled as debts.');
        }

        if ($sale->payment_status === 'paid') {
            throw new InvalidArgumentException('This debt has already been settled.');
        }

        $sale->update([
            'payment_status' => 'paid',
            'amount_tendered' => $sale->total_amount,
            'change_amount' => 0,
            'settled_at' => now(),
            'notes' => $notes ? trim(($sale->notes ?? '') . " [Settled: {$notes}]") : $sale->notes,
        ]);

        return $sale->fresh('items');
    }

    /**
     * Get recent sales for quick POS receipt/history preview.
     */
    public function getRecentSales(int $limit = 20): Collection
    {
        return Sale::with('items')
            ->latest('id')
            ->limit(min(max($limit, 1), 100))
            ->get();
    }
}
