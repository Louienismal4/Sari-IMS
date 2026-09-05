<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\Product\BatchStoreProductRequest;
use App\Http\Requests\Product\StoreProductRequest;
use App\Http\Requests\Product\UpdateProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Services\ProductService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected ProductService $productService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $products = $this->productService->getProducts(
            search: $request->query('search'),
            categoryId: $request->query('category_id')
        );

        return $this->success(ProductResource::collection($products));
    }

    public function store(StoreProductRequest $request): JsonResponse
    {
        $result = $this->productService->storeProduct($request->validated());
        $message = $result['was_updated'] ? 'Product updated successfully' : 'Product created successfully';
        $status = $result['was_updated'] ? 200 : 201;

        return $this->success(new ProductResource($result['product']), $message, $status);
    }

    public function batchStore(BatchStoreProductRequest $request): JsonResponse
    {
        $products = $this->productService->batchStoreProducts($request->validated('products'));
        $count = count($products);

        return $this->created(
            ProductResource::collection($products),
            "{$count} products processed successfully"
        );
    }

    public function show(Product $product): JsonResponse
    {
        return $this->success(new ProductResource($product->load('category')));
    }

    public function update(UpdateProductRequest $request, Product $product): JsonResponse
    {
        $updated = $this->productService->updateProduct($product, $request->validated());
        return $this->success(new ProductResource($updated), 'Product updated successfully');
    }

    public function destroy(Product $product): JsonResponse
    {
        $this->productService->deleteProduct($product);
        return $this->success(null, 'Product deactivated successfully');
    }
}