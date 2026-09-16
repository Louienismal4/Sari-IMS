import { Category } from "@/features/settings/types/settings.types";

export interface Product {
  id: number;
  name: string;
  original_name?: string | null;
  barcode: string | null;
  unit: string;
  cost_price: string;
  selling_price: string;
  stock_quantity: number;
  reorder_level: number;
  is_active?: boolean;
  category: Category | null;
  category_id?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProductFormData {
  name: string;
  original_name?: string;
  barcode?: string;
  category_id: string;
  unit: string;
  cost_price: string;
  markup_percent: string;
  selling_price: string;
  stock_quantity: string;
  reorder_level: string;
  pieces_per_pack: string;
}

export type StockFilter = "all" | "in_stock" | "low_stock" | "out_of_stock";
export type SortField = "name" | "stock_quantity" | "cost_price" | "selling_price" | "margin";
export type SortOrder = "asc" | "desc";
