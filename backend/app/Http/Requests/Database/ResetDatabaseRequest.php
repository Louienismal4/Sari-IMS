<?php

namespace App\Http\Requests\Database;

use Illuminate\Foundation\Http\FormRequest;

class ResetDatabaseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'confirmation' => 'required|string',
            'mode' => 'nullable|string|in:clean_slate,demo_seed,keep_categories',
        ];
    }
}
