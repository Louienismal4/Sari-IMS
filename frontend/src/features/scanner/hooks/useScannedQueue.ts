"use client";

import { useState, useCallback, useEffect } from "react";
import { ScannedItem } from "@/features/scanner/types/scanner.types";
import { batchStoreProducts } from "@/features/products/api/productService";
import { SCANNED_QUEUE_STORAGE_KEY } from "@/constants/storage-keys";

export function useScannedQueue() {
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem(SCANNED_QUEUE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  const [batchImporting, setBatchImporting] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (scannedItems.length > 0) {
        localStorage.setItem(SCANNED_QUEUE_STORAGE_KEY, JSON.stringify(scannedItems));
      } else {
        localStorage.removeItem(SCANNED_QUEUE_STORAGE_KEY);
      }
    } catch (e) {
      console.error("Failed to persist scanned queue:", e);
    }
  }, [scannedItems]);

  const addItems = useCallback((newItems: ScannedItem[]) => {
    setScannedItems((prev) => [...prev, ...newItems]);
  }, []);

  const updateItem = useCallback((index: number, updated: ScannedItem) => {
    setScannedItems((prev) => prev.map((item, idx) => (idx === index ? updated : item)));
  }, []);

  const removeItem = useCallback((index: number) => {
    setScannedItems((prev) => prev.filter((_, idx) => idx !== index));
  }, []);

  const clearQueue = useCallback(() => {
    setScannedItems([]);
  }, []);

  const importQueue = useCallback(async (): Promise<number> => {
    if (scannedItems.length === 0) return 0;
    setBatchImporting(true);

    try {
      const payload = scannedItems.map((item) => ({
        name: item.name,
        original_name: item.original_name || item.name,
        barcode: item.barcode || null,
        category_id: item.category_id || null,
        unit: item.unit || "pc",
        cost_price: item.cost_price,
        selling_price: item.selling_price,
        stock_quantity: item.stock_quantity || 1,
        reorder_level: item.reorder_level || 5,
      }));

      const imported = await batchStoreProducts(payload);
      clearQueue();
      return imported.length;
    } finally {
      setBatchImporting(false);
    }
  }, [scannedItems, clearQueue]);

  return {
    scannedItems,
    batchImporting,
    addItems,
    updateItem,
    removeItem,
    clearQueue,
    importQueue,
  };
}
