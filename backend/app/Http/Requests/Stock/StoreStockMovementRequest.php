<?php

namespace App\Http\Requests\Stock;

use Illuminate\Foundation\Http\FormRequest;

class StoreStockMovementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'product_id' => 'required|exists:products,id',
            'type' => 'required|in:restock,damage,expired,adjustment',
            'quantity_change' => 'required|integer|not_in:0',
            'notes' => 'nullable|string|max:255',
        ];
    }
}
