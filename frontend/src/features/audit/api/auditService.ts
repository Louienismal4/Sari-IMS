import { apiClient } from "@/lib/api-client";
import { AuditSheetResponse, StockAudit, SubmitAuditPayload } from "@/types/inventory";

export async function fetchAuditSheet(): Promise<AuditSheetResponse> {
  return apiClient<AuditSheetResponse>("/audits/sheet");
}

export async function submitStockAudit(payload: SubmitAuditPayload): Promise<StockAudit> {
  return apiClient<StockAudit>("/audits", {
    method: "POST",
    body: payload,
  });
}

export async function fetchAuditHistory(limit = 20): Promise<StockAudit[]> {
  return apiClient<StockAudit[]>("/audits", {
    params: { limit },
  });
}

export async function fetchAuditDetails(id: number): Promise<StockAudit> {
  return apiClient<StockAudit>(`/audits/${id}`);
}
