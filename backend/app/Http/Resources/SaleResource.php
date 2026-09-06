<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SaleResource extends JsonResource
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
            'invoice_number' => $this->invoice_number,
            'customer_name' => $this->customer_name,
            'customer_phone' => $this->customer_phone,
            'payment_type' => $this->payment_type,
            'payment_status' => $this->payment_status,
            'total_amount' => (float) $this->total_amount,
            'amount_tendered' => (float) $this->amount_tendered,
            'change_amount' => (float) $this->change_amount,
            'notes' => $this->notes,
            'settled_at' => $this->settled_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
            'items' => SaleItemResource::collection($this->whenLoaded('items')),
        ];
    }
}
