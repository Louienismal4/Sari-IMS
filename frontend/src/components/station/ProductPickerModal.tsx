"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, X, Package, Check, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Product } from "@/features/products/types/product.types";
import { ScannedItem } from "@/features/scanner/types/scanner.types";
import { searchAndRankCatalogProducts } from "@/features/scanner/utils/productMatcher";

interface ProductPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  scannedItem: ScannedItem | null;
  catalogProducts: Product[];
  onSelectProduct: (product: Product) => void;
  onUnlink: () => void;
}

export function ProductPickerModal({
  isOpen,
  onClose,
  scannedItem,
  catalogProducts,
  onSelectProduct,
  onUnlink,
}: ProductPickerModalProps) {
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (isOpen && scannedItem) {
      setSearch(scannedItem.name || "");
    }
  }, [isOpen, scannedItem]);

  const filteredProducts = useMemo(() => {
    return searchAndRankCatalogProducts(search, catalogProducts, 40);
  }, [catalogProducts, search]);

  if (!scannedItem) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-white">
        <DialogHeader className="p-4 sm:p-6 border-b border-zinc-200 pb-4">
          <DialogTitle className="text-base font-bold text-zinc-900">
            Link to Catalog Product
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500">
            Select an existing catalog product to restock with this receipt item, or keep it as a new product.
          </DialogDescription>

          {/* Scanned item banner */}
          <div className="mt-3 p-3 bg-zinc-50 rounded-lg border border-zinc-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div>
              <span className="text-zinc-500 font-medium">Receipt text: </span>
              <strong className="text-zinc-900">{scannedItem.original_name || scannedItem.name}</strong>
              <div className="text-[11px] text-zinc-500 mt-0.5">
                Cost: ₱{parseFloat(scannedItem.cost_price || "0").toFixed(2)} | Qty: {scannedItem.stock_quantity} {scannedItem.unit}
              </div>
            </div>
            {scannedItem.matched_product_id ? (
              <Badge variant="success" className="gap-1">
                <Check className="w-3 h-3" />
                Linked to {scannedItem.matched_product_name}
              </Badge>
            ) : (
              <Badge variant="secondary">Currently: New Product</Badge>
            )}
          </div>

          {/* Search bar */}
          <div className="relative mt-3">
            <Input
              type="text"
              placeholder="Search catalog by product name or barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-7 text-xs font-mono h-9"
              autoFocus
            />
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-3 pointer-events-none" />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-2 text-zinc-400 hover:text-zinc-600 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </DialogHeader>

        {/* Scrollable list of products */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1.5 min-h-[220px] max-h-[380px]">
          {scannedItem.matched_product_id && (
            <div className="p-2 mb-2 bg-rose-50/70 border border-rose-100 rounded-lg flex items-center justify-between">
              <span className="text-xs text-rose-700">
                Want to create this as a brand new product instead?
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onUnlink();
                  onClose();
                }}
                className="h-7 text-xs text-rose-600 border-rose-200 hover:bg-rose-100/50"
              >
                Unlink (Set as New)
              </Button>
            </div>
          )}

          {filteredProducts.length === 0 ? (
            <div className="py-12 text-center text-zinc-400 space-y-2">
              <Package className="w-8 h-8 mx-auto text-zinc-300" />
              <p className="text-xs font-medium text-zinc-600">No matching catalog products found</p>
              <p className="text-[11px] text-zinc-400">
                Try searching a different keyword or keep this item as a new product.
              </p>
            </div>
          ) : (
            filteredProducts.map((product) => {
              const isSelected = scannedItem.matched_product_id === product.id;
              const isSuggested = scannedItem.suggested_product_id === product.id;

              return (
                <div
                  key={product.id}
                  onClick={() => {
                    onSelectProduct(product);
                    onClose();
                  }}
                  className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500"
                      : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-zinc-900 truncate">
                        {product.name}
                      </span>
                      {isSuggested && !isSelected && (
                        <Badge variant="amber" className="text-[10px] py-0 px-1.5 gap-0.5">
                          <Sparkles className="w-2.5 h-2.5" />
                          Suggested
                        </Badge>
                      )}
                      {isSelected && (
                        <Badge variant="success" className="text-[10px] py-0 px-1.5">
                          Currently Linked
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-500 mt-0.5 font-mono">
                      <span>Stock: <strong className="text-zinc-800">{product.stock_quantity} {product.unit}</strong></span>
                      <span>•</span>
                      <span>Cost: ₱{parseFloat(product.cost_price).toFixed(2)}</span>
                      <span>•</span>
                      <span>Shelf: ₱{parseFloat(product.selling_price).toFixed(2)}</span>
                      {product.barcode && (
                        <>
                          <span>•</span>
                          <span className="truncate">SKU: {product.barcode}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <Button
                    variant={isSelected ? "emerald" : "outline"}
                    size="sm"
                    className="h-7 text-xs shrink-0"
                  >
                    {isSelected ? "Selected" : "Select"}
                  </Button>
                </div>
              );
            })
          )}
        </div>

        <DialogFooter className="p-3 bg-zinc-50 border-t border-zinc-200">
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 text-xs text-zinc-600">
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
