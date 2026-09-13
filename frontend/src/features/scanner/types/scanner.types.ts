export interface ScannedItem {
  name: string;
  original_name: string;
  barcode: string | null;
  cost_price: string;
  selling_price: string;
  stock_quantity: number;
  unit: string;
  category_id: number | null;
  category_name: string;
  reorder_level: number;
  matched_product_id?: number | null;
  matched_product_name?: string | null;
  current_stock?: number | null;
  catalog_unit?: string | null;
  catalog_selling_price?: string | null;
  update_mode?: "add" | "replace";
  suggested_product_id?: number | null;
  suggested_product_name?: string | null;
  match_confidence?: "exact" | "high" | "suggested" | null;
}

export interface ScanQuota {
  scans_used_today: number;
  scans_remaining_today: number;
  daily_limit: number;
  tokens_used_last_scan: number;
  approx_tokens_remaining: number;
  reset_time?: string;
  model_used?: string;
}
