<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StockAuditResource extends JsonResource
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
            'audit_code' => $this->audit_code,
            'status' => $this->status,
            'started_at' => $this->started_at?->toISOString(),
            'completed_at' => $this->completed_at?->toISOString(),
            'total_items_audited' => (int) $this->total_items_audited,
            'total_units_sold' => (int) $this->total_units_sold,
            'total_expected_revenue' => (float) $this->total_expected_revenue,
            'total_gross_profit' => (float) $this->total_gross_profit,
            'notes' => $this->notes,
            'created_at' => $this->created_at?->toISOString(),
            'items' => StockAuditItemResource::collection($this->whenLoaded('items')),
        ];
    }
}
