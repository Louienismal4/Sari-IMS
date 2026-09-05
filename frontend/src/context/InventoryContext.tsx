"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { toast as shadcnToast } from "@/hooks/use-toast";
import { Product, Category, StoreSettings, UnitOfMeasure } from "@/types/inventory";
import { fetchProducts } from "@/features/products/api/productService";
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/features/settings/api/categoryService";
import {
  DEFAULT_UNITS,
  DEFAULT_STORE_SETTINGS,
  loadStoreSettings,
  saveStoreSettings,
} from "@/services/settingsService";
import { useDashboardMetrics } from "@/features/dashboard/hooks/useDashboardMetrics";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastInfo {
  id: number;
  message: string;
  type: ToastType;
}

interface InventoryContextType {
  products: Product[];
  categories: Category[];
  settings: StoreSettings;
  allUnits: UnitOfMeasure[];
  totalSKUs: number;
  totalUnits: number;
  totalCapital: number;
  totalRevenue: number;
  totalTubo: number;
  overallMargin: string;
  lowStockCount: number;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  refreshInventory: () => Promise<void>;
  updateSettings: (newSettings: StoreSettings) => void;
  addCategory: (name: string) => Promise<Category>;
  editCategory: (id: number, name: string) => Promise<Category>;
  removeCategory: (id: number) => Promise<void>;
  isLoading: boolean;
  toast: ToastInfo | null;
  showToast: (message: string, type?: ToastType) => void;
  hideToast: () => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    const variantMap: Record<ToastType, "default" | "destructive" | "success" | "warning" | "info"> = {
      success: "success",
      error: "destructive",
      warning: "warning",
      info: "info",
    };

    shadcnToast({
      description: message,
      variant: variantMap[type] || "default",
    });
  }, []);

  const hideToast = useCallback(() => {}, []);

  // Refresh Products and Categories
  const refreshInventory = useCallback(async () => {
    try {
      const [prodData, catData] = await Promise.allSettled([
        fetchProducts(),
        fetchCategories(),
      ]);
      if (prodData.status === "fulfilled") setProducts(prodData.value);
      if (catData.status === "fulfilled") setCategories(catData.value);
    } catch (err) {
      console.error("Failed to load inventory:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial Load
  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        const loadedSettings = loadStoreSettings();
        setSettings(loadedSettings);

        const [prodData, catData] = await Promise.allSettled([
          fetchProducts(),
          fetchCategories(),
        ]);
        if (!ignore) {
          if (prodData.status === "fulfilled") setProducts(prodData.value);
          if (catData.status === "fulfilled") setCategories(catData.value);
        }
      } catch (err) {
        console.error("Failed to initialize inventory:", err);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, []);

  const updateSettings = useCallback((newSettings: StoreSettings) => {
    setSettings(newSettings);
    saveStoreSettings(newSettings);
  }, []);

  const addCategoryAction = useCallback(async (name: string) => {
    const created = await createCategory(name);
    setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    return created;
  }, []);

  const editCategoryAction = useCallback(async (id: number, name: string) => {
    const updated = await updateCategory(id, name);
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? updated : c)).sort((a, b) => a.name.localeCompare(b.name))
    );
    return updated;
  }, []);

  const removeCategoryAction = useCallback(
    async (id: number) => {
      await deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      await refreshInventory();
    },
    [refreshInventory]
  );

  const allUnits: UnitOfMeasure[] = [
    ...DEFAULT_UNITS,
    ...(settings.custom_units || []),
  ];

  const metrics = useDashboardMetrics(products);

  return (
    <InventoryContext.Provider
      value={{
        products,
        categories,
        settings,
        allUnits,
        totalSKUs: metrics.totalSKUs,
        totalUnits: metrics.totalUnits,
        totalCapital: metrics.totalCapital,
        totalRevenue: metrics.totalRevenue,
        totalTubo: metrics.totalTubo,
        overallMargin: metrics.overallMargin,
        lowStockCount: metrics.lowStockCount,
        sidebarOpen,
        setSidebarOpen,
        refreshInventory,
        updateSettings,
        addCategory: addCategoryAction,
        editCategory: editCategoryAction,
        removeCategory: removeCategoryAction,
        isLoading,
        toast: null,
        showToast,
        hideToast,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error("useInventory must be used within an InventoryProvider");
  }
  return context;
}
