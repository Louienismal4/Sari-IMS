<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StockAuditItemResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'stock_audit_id' => $this->stock_audit_id,
            'product_id' => $this->product_id,
            'product_name' => $this->product?->name ?? 'Unknown Item',
            'unit' => $this->product?->unit ?? 'pc',
            'barcode' => $this->product?->barcode,
            'category_name' => $this->product?->category?->name,
            'starting_stock' => (int) $this->starting_stock,
            'restocked_quantity' => (int) $this->restocked_quantity,
            'expected_stock' => (int) ($this->starting_stock + $this->restocked_quantity),
            'physical_count' => (int) $this->physical_count,
            'units_sold' => (int) $this->units_sold,
            'unit_cost' => (float) $this->unit_cost,
            'unit_price' => (float) $this->unit_price,
            'subtotal_revenue' => (float) $this->subtotal_revenue,
            'subtotal_profit' => (float) $this->subtotal_profit,
            'discrepancy_notes' => $this->discrepancy_notes,
        ];
    }
}
