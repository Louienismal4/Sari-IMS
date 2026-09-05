import { apiClient } from "@/lib/api-client";

export async function resetDatabaseApi(
  confirmation: string,
  mode: "clean_slate" | "demo_seed" | "keep_categories" = "clean_slate",
  adminSecret?: string
): Promise<string> {
  const headers: Record<string, string> = {};
  if (adminSecret) {
    headers["X-Admin-Secret"] = adminSecret;
  }

  const res = await apiClient<{ message?: string } | string>("/database/reset", {
    method: "POST",
    headers,
    body: { confirmation, mode },
  });

  if (typeof res === "string") return res;
  return res.message || "Database reset successfully";
}
