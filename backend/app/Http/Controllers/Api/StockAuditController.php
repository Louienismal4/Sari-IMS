<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\Audit\SubmitAuditRequest;
use App\Http\Resources\StockAuditResource;
use App\Services\StockAuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class StockAuditController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected StockAuditService $stockAuditService
    ) {}

    /**
     * Get live audit counting sheet.
     */
    public function sheet(): JsonResponse
    {
        $sheetData = $this->stockAuditService->getAuditSheet();
        return $this->success($sheetData);
    }

    /**
     * Submit physical audit and reconcile stock quantities.
     */
    public function store(SubmitAuditRequest $request): JsonResponse
    {
        try {
            $audit = $this->stockAuditService->submitAudit($request->validated());

            return $this->created(
                new StockAuditResource($audit),
                "Stock audit #{$audit->audit_code} completed successfully. {$audit->total_units_sold} units sold reconciled."
            );
        } catch (InvalidArgumentException $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    /**
     * List past completed audits.
     */
    public function index(Request $request): JsonResponse
    {
        $limit = (int) $request->input('limit', 20);
        $audits = $this->stockAuditService->getAuditHistory($limit);

        return $this->success(StockAuditResource::collection($audits));
    }

    /**
     * Show single audit report.
     */
    public function show(int $id): JsonResponse
    {
        $audit = $this->stockAuditService->getAuditDetails($id);
        return $this->success(new StockAuditResource($audit));
    }
}
