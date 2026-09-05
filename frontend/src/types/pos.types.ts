import { Product } from "./inventory";

export interface CartItem {
  product: Product;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface SaleItem {
  id: number;
  sale_id: number;
  product_id: number | null;
  product_name: string;
  unit: string;
  unit_price: number;
  cost_price: number;
  quantity: number;
  subtotal: number;
}

export interface Sale {
  id: number;
  invoice_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  payment_type: "cash" | "credit";
  payment_status: "paid" | "unpaid";
  total_amount: number;
  amount_tendered: number;
  change_amount: number;
  notes: string | null;
  settled_at: string | null;
  created_at: string;
  items?: SaleItem[];
}

export interface PosCheckoutPayload {
  payment_type: "cash" | "credit";
  customer_name?: string;
  customer_phone?: string;
  amount_tendered?: number;
  notes?: string;
  items: {
    product_id: number;
    quantity: number;
  }[];
}
