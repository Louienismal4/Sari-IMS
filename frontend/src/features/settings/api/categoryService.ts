import { Category } from "@/features/settings/types/settings.types";
import { apiClient } from "@/lib/api-client";

export async function fetchCategories(): Promise<Category[]> {
  return apiClient<Category[]>("/categories");
}

export async function createCategory(name: string): Promise<Category> {
  return apiClient<Category>("/categories", {
    method: "POST",
    body: { name },
  });
}

export async function updateCategory(id: number, name: string): Promise<Category> {
  return apiClient<Category>(`/categories/${id}`, {
    method: "PUT",
    body: { name },
  });
}

export async function deleteCategory(id: number): Promise<void> {
  return apiClient<void>(`/categories/${id}`, {
    method: "DELETE",
  });
}
