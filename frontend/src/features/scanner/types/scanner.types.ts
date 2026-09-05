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
