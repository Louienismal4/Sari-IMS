<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\Receipt\ScanReceiptRequest;
use App\Services\ReceiptOcrService;
use App\Services\ScanQuotaService;
use Exception;
use Illuminate\Http\JsonResponse;

class ReceiptScanController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected ReceiptOcrService $receiptOcrService,
        protected ScanQuotaService $scanQuotaService
    ) {}

    public function scan(ScanReceiptRequest $request): JsonResponse
    {
        $base64Data = null;
        $mimeType = 'image/jpeg';

        if ($request->hasFile('image')) {
            $file = $request->file('image');
            $mimeType = $file->getMimeType() ?: 'image/jpeg';
            $base64Data = base64_encode(file_get_contents($file->getRealPath()));
        } elseif ($request->filled('image_base64')) {
            $base64String = $request->input('image_base64');
            if (preg_match('/^data:(image\/[a-zA-Z0-9\+\-]+);base64,(.+)$/', $base64String, $matches)) {
                $mimeType = $matches[1];
                $base64Data = $matches[2];
            } else {
                $base64Data = $base64String;
            }
        } else {
            return $this->error('Please provide a receipt image file or base64 image string.', 422);
        }

        try {
            $result = $this->receiptOcrService->processReceipt($base64Data, $mimeType);
            $quota = $this->scanQuotaService->recordScan($result['totalTokens'], $result['usedModel']);

            return response()->json([
                'status' => 'success',
                'message' => 'Receipt processed successfully',
                'count' => count($result['items']),
                'data' => $result['items'],
                'quota' => $quota,
            ]);
        } catch (Exception $e) {
            \Illuminate\Support\Facades\Log::error('Receipt OCR failure: ' . $e->getMessage());
            return $this->error('Failed to process receipt with AI. Please verify image clarity and try again.', 500);
        }
    }

    public function quota(): JsonResponse
    {
        return $this->success($this->scanQuotaService->getQuota());
    }
}
