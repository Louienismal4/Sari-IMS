<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Services\BackupService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class BackupController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected BackupService $backupService
    ) {}

    /**
     * Export complete store instance snapshot.
     */
    public function export(Request $request): JsonResponse
    {
        try {
            $storeSettings = null;
            if ($request->has('settings')) {
                $raw = $request->input('settings');
                $storeSettings = is_string($raw) ? json_decode($raw, true) : $raw;
            }

            $backup = $this->backupService->exportInstanceBackup($storeSettings);

            return response()->json($backup);
        } catch (Throwable $e) {
            return $this->error('Failed to generate full instance backup: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Restore store instance snapshot.
     */
    public function restore(Request $request): JsonResponse
    {
        $request->validate([
            'backup_data' => 'required',
            'mode' => 'nullable|string|in:full,merge',
        ]);

        try {
            $backupData = $request->input('backup_data');
            if (is_string($backupData)) {
                $backupData = json_decode($backupData, true);
            }

            if (!is_array($backupData)) {
                return $this->error('Invalid backup data format. Expected JSON object or array.', 422);
            }

            $mode = $request->input('mode', 'full');
            $result = $this->backupService->restoreInstanceBackup($backupData, $mode);

            return $this->success(
                $result,
                "Instance restored successfully! ({$result['products_restored']} products, {$result['categories_restored']} categories, {$result['sales_restored']} sales restored)"
            );
        } catch (Throwable $e) {
            return $this->error('Failed to restore instance backup: ' . $e->getMessage(), 500);
        }
    }
}
