<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class IntegrationCredential extends Model
{
    use HasFactory;

    protected $fillable = [
        'provider',
        'key',
        'encrypted_value',
    ];

    /**
     * Never expose raw encrypted or decrypted secrets in JSON payloads.
     */
    protected $hidden = [
        'encrypted_value',
    ];
}
