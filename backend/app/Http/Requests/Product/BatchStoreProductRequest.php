<?php

namespace App\Http\Requests\Product;

use Illuminate\Foundation\Http\FormRequest;

class BatchStoreProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'products' => 'required|array|min:1',
            'products.*.category_id' => 'nullable|exists:categories,id',
            'products.*.barcode' => 'nullable|string|max:255',
            'products.*.name' => 'required|string|max:255',
            'products.*.original_name' => 'nullable|string|max:255',
            'products.*.unit' => 'required|string|max:50',
            'products.*.cost_price' => 'required|numeric|min:0',
            'products.*.selling_price' => 'required|numeric|min:0',
            'products.*.stock_quantity' => 'required|integer|min:0',
            'products.*.reorder_level' => 'nullable|integer|min:0',
        ];
    }
}
