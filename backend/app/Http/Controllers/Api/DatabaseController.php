<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\Database\ResetDatabaseRequest;
use App\Services\DatabaseAdminService;
use Illuminate\Http\JsonResponse;
use InvalidArgumentException;

class DatabaseController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected DatabaseAdminService $databaseAdminService
    ) {}

    public function reset(ResetDatabaseRequest $request): JsonResponse
    {
        if (app()->isProduction()) {
            $adminSecret = config('app.admin_secret');
            $providedSecret = $request->header('X-Admin-Secret') ?: $request->input('admin_secret');
            if (empty($adminSecret) || !hash_equals($adminSecret, (string) $providedSecret)) {
                return $this->error('Database reset is disabled in production environments without valid admin authorization.', 403);
            }
        }

        try {
            $message = $this->databaseAdminService->resetDatabase(
                confirmation: $request->validated('confirmation'),
                mode: $request->validated('mode', 'clean_slate')
            );

            return $this->success(null, $message);
        } catch (InvalidArgumentException $e) {
            return $this->error($e->getMessage(), 422);
        }
    }
}
