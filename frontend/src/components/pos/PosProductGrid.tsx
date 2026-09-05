"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Search, Barcode, Plus, PackageX, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Product, Category } from "@/types/inventory";

interface PosProductGridProps {
  products: Product[];
  categories: Category[];
  onAddToCart: (product: Product) => void;
  cartProductCounts?: Record<number, number>;
}

export function PosProductGrid({
  products,
  categories,
  onAddToCart,
  cartProductCounts = {},
}: PosProductGridProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | "all">("all");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut '/' to immediately focus product search
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

  // Filter products by search query (name or barcode) and selected category
  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();

    return products.filter((product) => {
      if (selectedCategory !== "all" && product.category_id !== selectedCategory) {
        return false;
      }

      if (!q) return true;

      const nameMatch = product.name.toLowerCase().includes(q);
      const barcodeMatch = product.barcode?.toLowerCase().includes(q) ?? false;
      const origMatch = product.original_name?.toLowerCase().includes(q) ?? false;

      return nameMatch || barcodeMatch || origMatch;
    });
  }, [products, search, selectedCategory]);

  // Handle direct barcode Enter key press
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && filteredProducts.length === 1) {
      e.preventDefault();
      onAddToCart(filteredProducts[0]);
      setSearch("");
    }
  };

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Search Input Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
        <Input
          ref={searchInputRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="Search items by name or scan barcode... (Press '/' to focus)"
          className="pl-10 pr-20 h-11 bg-white border-zinc-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm shadow-sm"
        />
        {search ? (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-600 px-1.5 py-0.5 rounded bg-zinc-100"
          >
            Clear
          </button>
        ) : (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] font-mono text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200">
            <kbd>/</kbd>
          </div>
        )}
      </div>

      {/* Category Pills Filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <Button
          type="button"
          size="sm"
          variant={selectedCategory === "all" ? "default" : "outline"}
          onClick={() => setSelectedCategory("all")}
          className="h-7 text-xs px-3 rounded-full shrink-0 font-medium"
        >
          All Items ({products.length})
        </Button>
        {categories.map((cat) => {
          const count = products.filter((p) => p.category_id === cat.id).length;
          return (
            <Button
              key={cat.id}
              type="button"
              size="sm"
              variant={selectedCategory === cat.id ? "default" : "outline"}
              onClick={() => setSelectedCategory(cat.id)}
              className="h-7 text-xs px-3 rounded-full shrink-0 font-medium"
            >
              {cat.name} ({count})
            </Button>
          );
        })}
      </div>

      {/* Products Grid */}
      <div className="flex-1 overflow-y-auto pr-1">
        {filteredProducts.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-white rounded-xl border border-dashed border-zinc-200">
            <PackageX className="w-8 h-8 text-zinc-300 mb-2" />
            <p className="text-sm font-medium text-zinc-600">No items found</p>
            <p className="text-xs text-zinc-400 mt-1">
              {search ? `No products match "${search}"` : "No products available in this category"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {filteredProducts.map((product) => {
              const inCartCount = cartProductCounts[product.id] || 0;
              const isOutOfStock = product.stock_quantity <= 0;
              const price = parseFloat(product.selling_price) || 0;

              return (
                <Card
                  key={product.id}
                  onClick={() => !isOutOfStock && onAddToCart(product)}
                  className={`relative flex flex-col justify-between p-3 transition-all rounded-xl border select-none ${
                    isOutOfStock
                      ? "bg-zinc-50/70 border-zinc-200 opacity-60 cursor-not-allowed"
                      : "bg-white hover:border-blue-400 hover:shadow-sm active:scale-[0.98] cursor-pointer"
                  }`}
                >
                  {/* Cart badge indicator */}
                  {inCartCount > 0 && (
                    <div className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow-sm ring-2 ring-white">
                      {inCartCount}
                    </div>
                  )}

                  {/* Header info */}
                  <div>
                    <div className="flex items-center justify-between gap-1 text-[11px] text-zinc-400 mb-1">
                      <span className="truncate">{product.category?.name || "Uncategorized"}</span>
                      {product.barcode && (
                        <span className="font-mono text-[10px] text-zinc-400 shrink-0">
                          {product.barcode.slice(-4)}
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-semibold text-zinc-900 line-clamp-2 leading-snug">
                      {product.name}
                    </h4>
                  </div>

                  {/* Pricing & Stock bottom line */}
                  <div className="mt-3 pt-2 border-t border-zinc-100 flex items-end justify-between">
                    <div>
                      <span className="text-[10px] text-zinc-400 uppercase font-mono">Retail</span>
                      <p className="text-sm font-bold text-zinc-900 font-mono">
                        ₱{price.toFixed(2)}
                      </p>
                    </div>

                    <div className="text-right">
                      {isOutOfStock ? (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                          Out
                        </Badge>
                      ) : (
                        <span
                          className={`text-[11px] font-mono font-medium ${
                            product.stock_quantity <= product.reorder_level
                              ? "text-rose-600"
                              : "text-zinc-500"
                          }`}
                        >
                          {product.stock_quantity} {product.unit}
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
