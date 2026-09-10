<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Store extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'owner_name',
        'address',
        'timezone',
        'currency',
        'currency_symbol',
        'target_markup_percentage',
        'default_reorder_level',
        'contact_information',
    ];

    protected $casts = [
        'target_markup_percentage' => 'float',
        'default_reorder_level' => 'integer',
        'contact_information' => 'array',
    ];

    public static function current(): ?self
    {
        return self::first();
    }
}
