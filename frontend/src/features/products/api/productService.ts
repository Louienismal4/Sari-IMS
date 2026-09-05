import { Product } from "@/features/products/types/product.types";
import { apiClient } from "@/lib/api-client";

export async function fetchProducts(params?: {
  search?: string;
  category_id?: number | string;
  low_stock?: boolean;
}): Promise<Product[]> {
  return apiClient<Product[]>("/products", {
    params: {
      search: params?.search,
      category_id: params?.category_id !== "all" ? params?.category_id : undefined,
      low_stock: params?.low_stock ? true : undefined,
    },
  });
}

export async function createProduct(payload: Partial<Product>): Promise<Product> {
  return apiClient<Product>("/products", {
    method: "POST",
    body: payload,
  });
}

export async function updateProduct(id: number, payload: Partial<Product>): Promise<Product> {
  return apiClient<Product>(`/products/${id}`, {
    method: "PUT",
    body: payload,
  });
}

export async function deleteProduct(id: number): Promise<void> {
  return apiClient<void>(`/products/${id}`, {
    method: "DELETE",
  });
}

export async function batchStoreProducts(products: Partial<Product>[]): Promise<Product[]> {
  return apiClient<Product[]>("/products/batch", {
    method: "POST",
    body: { products },
  });
}
