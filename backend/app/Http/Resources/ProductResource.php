<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'original_name' => $this->original_name,
            'barcode' => $this->barcode,
            'unit' => $this->unit,
            'cost_price' => (string) $this->cost_price,
            'selling_price' => (string) $this->selling_price,
            'stock_quantity' => (int) $this->stock_quantity,
            'reorder_level' => (int) $this->reorder_level,
            'is_active' => (bool) $this->is_active,
            'category_id' => $this->category_id,
            'category' => $this->relationLoaded('category') && $this->category
                ? new CategoryResource($this->category)
                : null,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
