import { Product } from "@/features/products/types/product.types";

export type MovementType = "restock" | "damage" | "expired" | "adjustment";

export interface StockMovement {
  id: number;
  product_id: number;
  type: MovementType;
  quantity_change: number;
  notes: string | null;
  created_at: string;
  product?: Product;
}
