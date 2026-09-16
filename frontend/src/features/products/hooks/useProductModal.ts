"use client";

import { useState, useCallback } from "react";
import { Product, ProductFormData } from "@/features/products/types/product.types";
import { createProduct, updateProduct } from "@/features/products/api/productService";

const INITIAL_FORM_DATA: ProductFormData = {
  name: "",
  original_name: "",
  barcode: "",
  category_id: "",
  unit: "pc",
  cost_price: "",
  markup_percent: "25",
  selling_price: "",
  stock_quantity: "10",
  reorder_level: "5",
  pieces_per_pack: "12",
};

export function useProductModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(INITIAL_FORM_DATA);

  const openCreateModal = useCallback((defaultBarcode?: string) => {
    setModalMode("create");
    setEditingProductId(null);
    setFormError(null);
    setFormData({
      ...INITIAL_FORM_DATA,
      barcode: defaultBarcode || "",
    });
    setIsOpen(true);
  }, []);

  const openEditModal = useCallback((prod: Product) => {
    const cost = parseFloat(prod.cost_price) || 0;
    const retail = parseFloat(prod.selling_price) || 0;
    const initialMarkup = cost > 0 ? (((retail - cost) / cost) * 100).toFixed(1) : "25";

    setModalMode("edit");
    setEditingProductId(prod.id);
    setFormError(null);
    setFormData({
      name: prod.name,
      original_name: prod.original_name || prod.name,
      barcode: prod.barcode || "",
      category_id: prod.category_id ? String(prod.category_id) : "",
      unit: prod.unit || "pc",
      cost_price: prod.cost_price,
      markup_percent: initialMarkup,
      selling_price: prod.selling_price,
      stock_quantity: String(prod.stock_quantity),
      reorder_level: String(prod.reorder_level),
      pieces_per_pack: "12",
    });
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    setFormError(null);
  }, []);

  const handleConvertPackToPieces = useCallback(() => {
    const packCost = parseFloat(formData.cost_price) || 0;
    const packPcs = parseInt(formData.pieces_per_pack, 10) || 1;
    if (packCost <= 0 || packPcs <= 0) return;

    const unitCost = packCost / packPcs;
    const markup = parseFloat(formData.markup_percent) || 25;
    const unitRetail = unitCost * (1 + markup / 100);

    setFormData((prev) => ({
      ...prev,
      unit: "pc",
      cost_price: unitCost.toFixed(2),
      selling_price: unitRetail.toFixed(2),
      stock_quantity: String((parseInt(prev.stock_quantity, 10) || 1) * packPcs),
    }));
  }, [formData.cost_price, formData.pieces_per_pack, formData.markup_percent]);

  const handleSaveProduct = useCallback(
    async (onSuccess?: (savedProduct: Product) => void): Promise<Product | null> => {
      setLoading(true);
      setFormError(null);

      try {
        const payload: Partial<Product> = {
          name: formData.name.trim(),
          original_name: formData.original_name?.trim() || formData.name.trim(),
          barcode: formData.barcode?.trim() || null,
          category_id: formData.category_id ? parseInt(formData.category_id, 10) : null,
          unit: formData.unit,
          cost_price: formData.cost_price,
          selling_price: formData.selling_price,
          stock_quantity: parseInt(formData.stock_quantity, 10) || 0,
          reorder_level: parseInt(formData.reorder_level, 10) || 0,
        };

        let saved: Product;
        if (modalMode === "create") {
          saved = await createProduct(payload);
        } else if (editingProductId) {
          saved = await updateProduct(editingProductId, payload);
        } else {
          throw new Error("No product ID provided for edit mode");
        }

        setIsOpen(false);
        if (onSuccess) onSuccess(saved);
        return saved;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to save product";
        setFormError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [formData, modalMode, editingProductId]
  );

  return {
    isOpen,
    setIsOpen,
    modalMode,
    editingProductId,
    loading,
    formError,
    formData,
    setFormData,
    openCreateModal,
    openEditModal,
    closeModal,
    handleConvertPackToPieces,
    handleSaveProduct,
  };
}
