<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SaleItemResource extends JsonResource
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
            'sale_id' => $this->sale_id,
            'product_id' => $this->product_id,
            'product_name' => $this->product_name,
            'unit' => $this->unit,
            'unit_price' => (float) $this->unit_price,
            'cost_price' => (float) $this->cost_price,
            'quantity' => (int) $this->quantity,
            'subtotal' => (float) $this->subtotal,
        ];
    }
}
