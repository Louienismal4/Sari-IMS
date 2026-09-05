<?php

namespace App\Services;

use App\Models\Category;
use Illuminate\Database\Eloquent\Collection;

class CategoryService
{
    /**
     * Retrieve all categories with associated product counts.
     */
    public function getCategories(): Collection
    {
        return Category::withCount('products')
            ->orderBy('name', 'asc')
            ->get();
    }

    /**
     * Create a new category.
     */
    public function createCategory(array $data): Category
    {
        $category = Category::create($data);
        $category->products_count = 0;
        return $category;
    }

    /**
     * Update an existing category.
     */
    public function updateCategory(Category $category, array $data): Category
    {
        $category->update($data);
        $category->loadCount('products');
        return $category;
    }

    /**
     * Delete a category and unassign any associated products.
     */
    public function deleteCategory(Category $category): int
    {
        $productCount = $category->products()->count();

        if ($productCount > 0) {
            $category->products()->update(['category_id' => null]);
        }

        $category->delete();

        return $productCount;
    }
}
