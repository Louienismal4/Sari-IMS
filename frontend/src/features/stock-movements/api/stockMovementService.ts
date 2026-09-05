import { StockMovement } from "@/features/stock-movements/types/movement.types";
import { apiClient } from "@/lib/api-client";

export async function fetchStockMovements(limit = 20): Promise<StockMovement[]> {
  return apiClient<StockMovement[]>("/stock-movements", {
    params: { limit },
  });
}

export async function recordStockMovement(payload: {
  product_id: number;
  type: "restock" | "damage" | "expired" | "adjustment";
  quantity_change: number;
  notes?: string;
}): Promise<StockMovement> {
  return apiClient<StockMovement>("/stock-movements", {
    method: "POST",
    body: payload,
  });
}
