<?php

namespace App\Http\Requests\Pos;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class CheckoutRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'payment_type' => 'required|in:cash,credit',
            'customer_name' => 'required_if:payment_type,credit|nullable|string|max:100',
            'customer_phone' => 'nullable|string|max:30',
            'amount_tendered' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:500',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
        ];
    }
}
