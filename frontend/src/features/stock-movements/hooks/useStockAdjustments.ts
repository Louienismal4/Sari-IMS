"use client";

import { useState, useCallback } from "react";
import { Product } from "@/features/products/types/product.types";
import { recordStockMovement } from "@/features/stock-movements/api/stockMovementService";
import { deleteProduct } from "@/features/products/api/productService";

interface UseStockAdjustmentsOptions {
  onRefresh?: () => Promise<void>;
  showToast?: (message: string, type?: "success" | "error" | "info" | "warning") => void;
}

export function useStockAdjustments(options?: UseStockAdjustmentsOptions) {
  const [updatingStockId, setUpdatingStockId] = useState<number | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleQuickStockChange = useCallback(
    async (product: Product, delta: number) => {
      const newStock = product.stock_quantity + delta;
      if (newStock < 0) {
        options?.showToast?.("Stock cannot be negative", "error");
        return;
      }

      setUpdatingStockId(product.id);
      try {
        await recordStockMovement({
          product_id: product.id,
          type: delta > 0 ? "restock" : "adjustment",
          quantity_change: delta,
          notes: delta > 0 ? "Quick restock (+1)" : "Quick dispense (-1)",
        });

        if (options?.onRefresh) {
          await options.onRefresh();
        }

        options?.showToast?.(
          `${product.name}: stock ${delta > 0 ? `+${delta}` : delta} (now ${newStock})`,
          "success"
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to update stock";
        options?.showToast?.(message, "error");
      } finally {
        setUpdatingStockId(null);
      }
    },
    [options]
  );

  const promptDeleteProduct = useCallback((product: Product) => {
    setProductToDelete(product);
    setIsDeleteModalOpen(true);
  }, []);

  const confirmDeleteProduct = useCallback(async () => {
    if (!productToDelete) return;
    setDeleteLoading(true);

    try {
      await deleteProduct(productToDelete.id);
      setIsDeleteModalOpen(false);
      setProductToDelete(null);

      if (options?.onRefresh) {
        await options.onRefresh();
      }

      options?.showToast?.(`"${productToDelete.name}" was successfully removed.`, "success");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete product";
      options?.showToast?.(message, "error");
    } finally {
      setDeleteLoading(false);
    }
  }, [productToDelete, options]);

  return {
    updatingStockId,
    handleQuickStockChange,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    productToDelete,
    deleteLoading,
    promptDeleteProduct,
    confirmDeleteProduct,
  };
}
