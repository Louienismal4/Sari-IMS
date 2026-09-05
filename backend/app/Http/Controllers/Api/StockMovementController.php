<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\Stock\StoreStockMovementRequest;
use App\Http\Resources\StockMovementResource;
use App\Services\StockMovementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class StockMovementController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected StockMovementService $stockMovementService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $limit = (int) $request->input('limit', 20);
        $movements = $this->stockMovementService->getStockMovements($limit);

        return $this->success(StockMovementResource::collection($movements));
    }

    public function store(StoreStockMovementRequest $request): JsonResponse
    {
        try {
            $movement = $this->stockMovementService->recordStockMovement($request->validated());
            return $this->created(
                new StockMovementResource($movement),
                'Stock movement recorded successfully'
            );
        } catch (InvalidArgumentException $e) {
            return $this->error($e->getMessage(), 422);
        }
    }
}