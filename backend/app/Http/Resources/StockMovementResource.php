<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StockMovementResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'product_id' => $this->product_id,
            'type' => $this->type,
            'quantity_change' => (int) $this->quantity_change,
            'notes' => $this->notes,
            'created_at' => $this->created_at?->toISOString(),
            'product' => $this->relationLoaded('product') && $this->product
                ? new ProductResource($this->product)
                : null,
        ];
    }
}
