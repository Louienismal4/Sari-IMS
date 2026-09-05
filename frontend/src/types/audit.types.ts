export interface AuditSheetItem {
  product_id: number;
  name: string;
  original_name?: string | null;
  barcode?: string | null;
  unit: string;
  category_id?: number | null;
  category_name: string;
  cost_price: number;
  selling_price: number;
  starting_stock: number;
  restocked_quantity: number;
  expected_stock: number;
  current_stock: number;
  suggested_physical_count: number;
}

export interface AuditSheetResponse {
  last_audit_completed_at: string | null;
  last_audit_code: string | null;
  total_products: number;
  items: AuditSheetItem[];
}

export interface StockAuditItem {
  id: number;
  stock_audit_id: number;
  product_id: number;
  product_name: string;
  unit: string;
  barcode?: string | null;
  category_name?: string | null;
  starting_stock: number;
  restocked_quantity: number;
  expected_stock: number;
  physical_count: number;
  units_sold: number;
  unit_cost: number;
  unit_price: number;
  subtotal_revenue: number;
  subtotal_profit: number;
  discrepancy_notes?: string | null;
}

export interface StockAudit {
  id: number;
  audit_code: string;
  status: "in_progress" | "completed";
  started_at: string;
  completed_at: string | null;
  total_items_audited: number;
  total_units_sold: number;
  total_expected_revenue: number;
  total_gross_profit: number;
  notes?: string | null;
  created_at: string;
  items?: StockAuditItem[];
}

export interface SubmitAuditPayload {
  notes?: string;
  items: {
    product_id: number;
    physical_count: number;
    discrepancy_notes?: string;
  }[];
}
