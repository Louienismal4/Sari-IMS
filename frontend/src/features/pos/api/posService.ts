import { apiClient } from "@/lib/api-client";
import { Sale, PosCheckoutPayload } from "@/types/inventory";

export async function checkoutPos(payload: PosCheckoutPayload): Promise<Sale> {
  return apiClient<Sale>("/pos/checkout", {
    method: "POST",
    body: payload,
  });
}

export async function fetchDebts(params?: {
  search?: string;
  status?: "paid" | "unpaid" | "all";
}): Promise<Sale[]> {
  return apiClient<Sale[]>("/pos/debts", {
    params: {
      search: params?.search,
      status: params?.status !== "all" ? params?.status : undefined,
    },
  });
}

export async function settleDebt(saleId: number, notes?: string): Promise<Sale> {
  return apiClient<Sale>(`/pos/debts/${saleId}/settle`, {
    method: "POST",
    body: { notes },
  });
}

export async function fetchRecentSales(limit = 20): Promise<Sale[]> {
  return apiClient<Sale[]>("/pos/sales", {
    params: { limit },
  });
}
