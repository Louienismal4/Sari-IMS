<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Product;
use App\Models\StockMovement;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Support\Facades\Schema;
use InvalidArgumentException;

class DatabaseAdminService
{
    private const REQUIRED_CONFIRMATION = 'confirm to reset my database';

    /**
     * Purge and reset inventory database according to specified mode.
     *
     * @throws InvalidArgumentException
     */
    public function resetDatabase(string $confirmation, string $mode = 'clean_slate'): string
    {
        $challenge = strtolower(trim($confirmation));
        if ($challenge !== self::REQUIRED_CONFIRMATION) {
            throw new InvalidArgumentException('Invalid confirmation phrase. You must type "' . self::REQUIRED_CONFIRMATION . '" exactly.');
        }

        Schema::disableForeignKeyConstraints();
        StockMovement::truncate();
        Product::truncate();

        if ($mode === 'clean_slate') {
            Category::truncate();
            $defaultCategories = [
                'Canned Goods',
                'Coffee & Beverages',
                'Instant Noodles',
                'Snacks & Biscuits',
                'Household & Personal Care',
                'Condiments & Spices',
                'Frozen & Dairy',
            ];
            foreach ($defaultCategories as $catName) {
                Category::create(['name' => $catName]);
            }
        } elseif ($mode === 'demo_seed') {
            Category::truncate();
            $seeder = new DatabaseSeeder();
            $seeder->run();
        }

        Schema::enableForeignKeyConstraints();

        return match ($mode) {
            'demo_seed' => 'Database reset and re-seeded with initial sample inventory.',
            'keep_categories' => 'All products and stock movements purged. Categories preserved.',
            default => 'Database successfully purged. Core category structure initialized.',
        };
    }
}
