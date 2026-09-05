<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            'Instant Noodles' => [
                ['name' => 'Lucky Me! Pancit Canton Original', 'barcode' => '4800016644810', 'unit' => 'pc', 'cost_price' => 12.50, 'selling_price' => 16.00, 'stock_quantity' => 48, 'reorder_level' => 10],
                ['name' => 'Lucky Me! Pancit Canton Extra Hot Chili', 'barcode' => '4800016644834', 'unit' => 'pc', 'cost_price' => 12.50, 'selling_price' => 16.00, 'stock_quantity' => 36, 'reorder_level' => 10],
                ['name' => 'Payless Xtra Big Pancit Canton Sweet & Spicy', 'barcode' => '4800016644900', 'unit' => 'pc', 'cost_price' => 16.00, 'selling_price' => 20.00, 'stock_quantity' => 24, 'reorder_level' => 8],
            ],
            'Coffee & Beverages' => [
                ['name' => 'Kopiko Blanca Twin Pack 52g', 'barcode' => '8996001414002', 'unit' => 'sachet', 'cost_price' => 12.00, 'selling_price' => 15.00, 'stock_quantity' => 60, 'reorder_level' => 15],
                ['name' => 'Nescafe 3in1 Original Twin Pack', 'barcode' => '4800361389028', 'unit' => 'sachet', 'cost_price' => 12.50, 'selling_price' => 15.00, 'stock_quantity' => 50, 'reorder_level' => 15],
                ['name' => 'Bear Brand Powdered Milk Drink 33g', 'barcode' => '4800361287607', 'unit' => 'sachet', 'cost_price' => 13.00, 'selling_price' => 16.00, 'stock_quantity' => 40, 'reorder_level' => 10],
            ],
            'Canned Goods' => [
                ['name' => '555 Sardines in Tomato Sauce (Green) 155g', 'barcode' => '4800194115126', 'unit' => 'can', 'cost_price' => 20.50, 'selling_price' => 25.00, 'stock_quantity' => 30, 'reorder_level' => 6],
                ['name' => 'San Marino Corned Tuna 150g', 'barcode' => '4800194178558', 'unit' => 'can', 'cost_price' => 34.00, 'selling_price' => 40.00, 'stock_quantity' => 20, 'reorder_level' => 5],
                ['name' => 'Argentina Corned Beef 150g', 'barcode' => '4800194145017', 'unit' => 'can', 'cost_price' => 36.00, 'selling_price' => 42.00, 'stock_quantity' => 18, 'reorder_level' => 5],
            ],
            'Snacks & Biscuits' => [
                ['name' => 'Rebisco Crackers Plain (Single Pack)', 'barcode' => '4800032111006', 'unit' => 'pack', 'cost_price' => 6.00, 'selling_price' => 8.00, 'stock_quantity' => 50, 'reorder_level' => 12],
                ['name' => 'Piattos Cheese 40g', 'barcode' => '4800016053018', 'unit' => 'pack', 'cost_price' => 15.50, 'selling_price' => 19.00, 'stock_quantity' => 25, 'reorder_level' => 8],
                ['name' => 'Fita Crackers Regular 30g', 'barcode' => '4800032120015', 'unit' => 'pack', 'cost_price' => 7.00, 'selling_price' => 10.00, 'stock_quantity' => 35, 'reorder_level' => 10],
            ],
            'Household & Personal Care' => [
                ['name' => 'Surf Powder Detergent Sun Fresh 55g', 'barcode' => '4800888137402', 'unit' => 'sachet', 'cost_price' => 7.50, 'selling_price' => 10.00, 'stock_quantity' => 48, 'reorder_level' => 12],
                ['name' => 'Palmolive Naturals Shampoo 15ml', 'barcode' => '4800028012010', 'unit' => 'sachet', 'cost_price' => 6.00, 'selling_price' => 8.00, 'stock_quantity' => 60, 'reorder_level' => 15],
            ],
        ];

        foreach ($categories as $catName => $products) {
            $category = Category::create(['name' => $catName]);

            foreach ($products as $prod) {
                $category->products()->create($prod);
            }
        }
    }
}