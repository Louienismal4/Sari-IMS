"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Product, StockFilter, SortField, SortOrder } from "@/features/products/types/product.types";

export function useProductFilters(products: Product[]) {
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<number | "all">("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 200);
    return () => clearTimeout(timer);
  }, [search]);

  // Handle column header sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Filtered and Sorted Products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        if (stockFilter === "in_stock" && p.stock_quantity <= 0) return false;
        if (
          stockFilter === "low_stock" &&
          (p.stock_quantity > p.reorder_level || p.stock_quantity <= 0)
        )
          return false;
        if (stockFilter === "out_of_stock" && p.stock_quantity > 0) return false;
        if (categoryFilter !== "all" && p.category_id !== categoryFilter) return false;

        if (debouncedSearch.trim()) {
          const q = debouncedSearch.toLowerCase().trim();
          const nameMatch = p.name.toLowerCase().includes(q);
          const origMatch = p.original_name?.toLowerCase().includes(q) ?? false;
          const barcodeMatch = p.barcode?.toLowerCase().includes(q) ?? false;
          const catMatch = p.category?.name.toLowerCase().includes(q) ?? false;
          return nameMatch || origMatch || barcodeMatch || catMatch;
        }
        return true;
      })
      .sort((a, b) => {
        let valA: string | number = 0;
        let valB: string | number = 0;

        if (sortField === "name") {
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
        } else if (sortField === "stock_quantity") {
          valA = a.stock_quantity;
          valB = b.stock_quantity;
        } else if (sortField === "cost_price") {
          valA = parseFloat(a.cost_price) || 0;
          valB = parseFloat(b.cost_price) || 0;
        } else if (sortField === "selling_price") {
          valA = parseFloat(a.selling_price) || 0;
          valB = parseFloat(b.selling_price) || 0;
        } else if (sortField === "margin") {
          const costA = parseFloat(a.cost_price) || 0;
          const retailA = parseFloat(a.selling_price) || 0;
          valA = costA > 0 ? ((retailA - costA) / costA) * 100 : 0;

          const costB = parseFloat(b.cost_price) || 0;
          const retailB = parseFloat(b.selling_price) || 0;
          valB = costB > 0 ? ((retailB - costB) / costB) * 100 : 0;
        }

        if (valA < valB) return sortOrder === "asc" ? -1 : 1;
        if (valA > valB) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
  }, [products, stockFilter, categoryFilter, debouncedSearch, sortField, sortOrder]);

  return {
    stockFilter,
    setStockFilter,
    categoryFilter,
    setCategoryFilter,
    sortField,
    sortOrder,
    handleSort,
    search,
    setSearch,
    debouncedSearch,
    searchInputRef,
    filteredProducts,
  };
}
