<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StockAudit extends Model
{
    use HasFactory;

    protected $fillable = [
        'audit_code',
        'status',
        'started_at',
        'completed_at',
        'total_items_audited',
        'total_units_sold',
        'total_expected_revenue',
        'total_gross_profit',
        'notes',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'total_items_audited' => 'integer',
        'total_units_sold' => 'integer',
        'total_expected_revenue' => 'decimal:2',
        'total_gross_profit' => 'decimal:2',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(StockAuditItem::class);
    }
}
