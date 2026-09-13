import { apiClient } from "@/lib/api-client";

export async function resetDatabaseApi(
  confirmation: string,
  mode: "clean_slate" | "demo_seed" | "keep_categories" = "clean_slate"
): Promise<string> {
  const res = await apiClient<{ message?: string } | string>("/database/reset", {
    method: "POST",
    body: { confirmation, mode },
  });

  if (typeof res === "string") return res;
  return res.message || "Database reset successfully";
}

export async function exportInstanceBackupApi(settings?: unknown): Promise<Record<string, unknown>> {
  return apiClient<Record<string, unknown>>("/backup/export", {
    method: "GET",
    params: {
      settings: settings ? JSON.stringify(settings) : undefined,
    },
  });
}

export interface RestoreBackupResult {
  categories_restored: number;
  products_restored: number;
  sales_restored: number;
  audits_restored: number;
  store_settings?: unknown;
  mode: string;
}

export async function restoreInstanceBackupApi(
  backupData: unknown,
  mode: "full" | "merge" = "full"
): Promise<RestoreBackupResult> {
  return apiClient<RestoreBackupResult>("/backup/restore", {
    method: "POST",
    body: { backup_data: backupData, mode },
  });
}

