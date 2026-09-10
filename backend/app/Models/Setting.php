<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    use HasFactory;

    protected $fillable = [
        'key',
        'value',
    ];

    public static function get(string $key, mixed $default = null): mixed
    {
        $setting = self::where('key', $key)->first();
        return $setting !== null ? $setting->value : $default;
    }

    public static function set(string $key, mixed $value): self
    {
        $val = is_array($value) || is_object($value) ? json_encode($value) : (string) $value;
        return self::updateOrCreate(
            ['key' => $key],
            ['value' => $val]
        );
    }

    public static function allKeyValues(): array
    {
        return self::pluck('value', 'key')->toArray();
    }
}
