<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\Category\StoreCategoryRequest;
use App\Http\Requests\Category\UpdateCategoryRequest;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use App\Services\CategoryService;
use Illuminate\Http\JsonResponse;

class CategoryController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected CategoryService $categoryService
    ) {}

    public function index(): JsonResponse
    {
        $categories = $this->categoryService->getCategories();
        return $this->success(CategoryResource::collection($categories));
    }

    public function store(StoreCategoryRequest $request): JsonResponse
    {
        $category = $this->categoryService->createCategory($request->validated());
        return $this->created(new CategoryResource($category), 'Category created successfully');
    }

    public function update(UpdateCategoryRequest $request, Category $category): JsonResponse
    {
        $updated = $this->categoryService->updateCategory($category, $request->validated());
        return $this->success(new CategoryResource($updated), 'Category updated successfully');
    }

    public function destroy(Category $category): JsonResponse
    {
        $unassignedCount = $this->categoryService->deleteCategory($category);
        $message = 'Category deleted successfully' . ($unassignedCount > 0 ? " ({$unassignedCount} products set to Uncategorized)" : '');
        return $this->success(null, $message);
    }
}
