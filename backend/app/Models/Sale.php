<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Sale extends Model
{
    use HasFactory;

    protected $fillable = [
        'invoice_number',
        'customer_name',
        'customer_phone',
        'payment_type',
        'payment_status',
        'total_amount',
        'amount_tendered',
        'change_amount',
        'notes',
        'settled_at',
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'amount_tendered' => 'decimal:2',
        'change_amount' => 'decimal:2',
        'settled_at' => 'datetime',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(SaleItem::class);
    }

    public function scopeUnpaidCredit($query)
    {
        return $query->where('payment_type', 'credit')
            ->where('payment_status', 'unpaid');
    }

    public function scopePaid($query)
    {
        return $query->where('payment_status', 'paid');
    }
}
