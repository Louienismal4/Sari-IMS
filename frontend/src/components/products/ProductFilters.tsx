"use client";

import { RefObject } from "react";
import { Search, X, SlidersHorizontal, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Product, StockFilter } from "@/types/inventory";

interface ProductFiltersProps {
  search: string;
  setSearch: (val: string) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  stockFilter: StockFilter;
  setStockFilter: (filter: StockFilter) => void;
  products: Product[];
}

export function ProductFilters({
  search,
  setSearch,
  searchInputRef,
  stockFilter,
  setStockFilter,
  products,
}: ProductFiltersProps) {
  const inStockCount = products.filter((p) => p.stock_quantity > p.reorder_level).length;
  const lowStockCount = products.filter(
    (p) => p.stock_quantity <= p.reorder_level && p.stock_quantity > 0
  ).length;
  const outOfStockCount = products.filter((p) => p.stock_quantity === 0).length;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      {/* Search Bar */}
      <div className="relative flex-1 max-w-md">
        <Input
          ref={searchInputRef}
          type="text"
          placeholder="Search by name, original receipt name, barcode (Press '/' to focus)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 pr-8 text-xs font-mono"
        />
        <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5 pointer-events-none" />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Stock Health Filter Buttons */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] text-zinc-400 uppercase font-mono font-bold mr-1 flex items-center gap-1">
          <SlidersHorizontal className="w-3 h-3" /> Filter:
        </span>
        <Button
          variant={stockFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setStockFilter("all")}
          className="h-7 text-xs px-2.5"
        >
          All ({products.length})
        </Button>
        <Button
          variant={stockFilter === "in_stock" ? "default" : "outline"}
          size="sm"
          onClick={() => setStockFilter("in_stock")}
          className="h-7 text-xs px-2.5"
        >
          In Stock ({inStockCount})
        </Button>
        <Button
          variant={stockFilter === "low_stock" ? "destructive" : "outline"}
          size="sm"
          onClick={() => setStockFilter("low_stock")}
          className="h-7 text-xs px-2.5 gap-1"
        >
          <AlertTriangle className="w-3 h-3" />
          <span>Low ({lowStockCount})</span>
        </Button>
        <Button
          variant={stockFilter === "out_of_stock" ? "destructive" : "outline"}
          size="sm"
          onClick={() => setStockFilter("out_of_stock")}
          className="h-7 text-xs px-2.5"
        >
          Out ({outOfStockCount})
        </Button>
      </div>
    </div>
  );
}
