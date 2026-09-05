<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockAuditItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'stock_audit_id',
        'product_id',
        'starting_stock',
        'restocked_quantity',
        'physical_count',
        'units_sold',
        'unit_cost',
        'unit_price',
        'subtotal_revenue',
        'subtotal_profit',
        'discrepancy_notes',
    ];

    protected $casts = [
        'starting_stock' => 'integer',
        'restocked_quantity' => 'integer',
        'physical_count' => 'integer',
        'units_sold' => 'integer',
        'unit_cost' => 'decimal:2',
        'unit_price' => 'decimal:2',
        'subtotal_revenue' => 'decimal:2',
        'subtotal_profit' => 'decimal:2',
    ];

    public function audit(): BelongsTo
    {
        return $this->belongsTo(StockAudit::class, 'stock_audit_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
