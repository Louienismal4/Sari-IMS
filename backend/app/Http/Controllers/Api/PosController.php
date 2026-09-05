<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\Pos\CheckoutRequest;
use App\Http\Resources\SaleResource;
use App\Models\Sale;
use App\Services\PosService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class PosController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected PosService $posService
    ) {}

    public function checkout(CheckoutRequest $request): JsonResponse
    {
        try {
            $sale = $this->posService->processCheckout($request->validated());

            $message = $sale->payment_type === 'credit'
                ? "Owed sale recorded successfully for {$sale->customer_name} (#{$sale->invoice_number})"
                : "Cash sale completed successfully (#{$sale->invoice_number})";

            return $this->created(new SaleResource($sale), $message);
        } catch (InvalidArgumentException $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    public function debts(Request $request): JsonResponse
    {
        $search = $request->query('search');
        $status = $request->query('status'); // 'paid', 'unpaid', or all

        $debts = $this->posService->getDebts($search, $status);

        return $this->success(SaleResource::collection($debts));
    }

    public function settleDebt(Request $request, Sale $sale): JsonResponse
    {
        $request->validate([
            'notes' => 'nullable|string|max:255',
        ]);

        try {
            $settledSale = $this->posService->settleDebt($sale, $request->input('notes'));

            return $this->success(
                new SaleResource($settledSale),
                "Debt for {$settledSale->customer_name} (#{$settledSale->invoice_number}) marked as settled."
            );
        } catch (InvalidArgumentException $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    public function sales(Request $request): JsonResponse
    {
        $limit = (int) $request->input('limit', 20);
        $sales = $this->posService->getRecentSales($limit);

        return $this->success(SaleResource::collection($sales));
    }
}
