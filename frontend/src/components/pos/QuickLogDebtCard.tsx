"use client";

import { useState, useMemo } from "react";
import { BookUser, Plus, Minus, Trash2, ShoppingCart, Check, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Product } from "@/types/inventory";

export interface StagedDebtItem {
  product: Product;
  quantity: number;
}

interface QuickLogDebtCardProps {
  products: Product[];
  onSaveDebt: (data: {
    customer_name: string;
    items: { product_id: number; quantity: number }[];
  }) => Promise<void>;
  isSaving: boolean;
}

export function QuickLogDebtCard({
  products,
  onSaveDebt,
  isSaving,
}: QuickLogDebtCardProps) {
  // Customer Details (Contact and promissory removed per request)
  const [customerName, setCustomerName] = useState("");

  // Staged Items (Multi-item support)
  const [stagedItems, setStagedItems] = useState<StagedDebtItem[]>([]);

  // Item Picker Fields
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [productSearch, setProductSearch] = useState("");

  // Filter products by optional search text
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const q = productSearch.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q) ||
        p.category?.name.toLowerCase().includes(q)
    );
  }, [products, productSearch]);

  // Selected product object
  const currentSelectedProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId) || null;
  }, [products, selectedProductId]);

  // Add currently picked item to staged list
  const handleAddItem = () => {
    if (!selectedProductId || itemQuantity <= 0) return;
    const product = products.find((p) => p.id === selectedProductId);
    if (!product) return;

    setStagedItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.product.id === product.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        const newQty = updated[existingIndex].quantity + itemQuantity;
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
        };
        return updated;
      }
      return [...prev, { product, quantity: itemQuantity }];
    });

    // Reset picker inputs for next item
    setSelectedProductId(null);
    setItemQuantity(1);
    setProductSearch("");
  };

  // Adjust quantity of an already staged item
  const handleUpdateQuantity = (productId: number, delta: number) => {
    setStagedItems((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter((item): item is StagedDebtItem => item !== null)
    );
  };

  // Direct quantity input change
  const handleSetExactQuantity = (productId: number, qty: number) => {
    if (qty <= 0) {
      handleRemoveItem(productId);
      return;
    }
    setStagedItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity: qty } : item
      )
    );
  };

  // Remove a single staged item
  const handleRemoveItem = (productId: number) => {
    setStagedItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // Clear all staged items
  const handleClearAll = () => {
    setStagedItems([]);
    setSelectedProductId(null);
    setItemQuantity(1);
  };

  // Calculated totals
  const totalAmount = useMemo(() => {
    const stagedSum = stagedItems.reduce(
      (acc, item) => acc + item.quantity * parseFloat(item.product.selling_price),
      0
    );
    if (stagedItems.length === 0 && currentSelectedProduct) {
      return itemQuantity * parseFloat(currentSelectedProduct.selling_price);
    }
    return stagedSum;
  }, [stagedItems, currentSelectedProduct, itemQuantity]);

  const totalItemPieces = useMemo(() => {
    if (stagedItems.length > 0) {
      return stagedItems.reduce((acc, item) => acc + item.quantity, 0);
    }
    return currentSelectedProduct ? itemQuantity : 0;
  }, [stagedItems, currentSelectedProduct, itemQuantity]);

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) return;

    let itemsToLog = stagedItems.map((item) => ({
      product_id: item.product.id,
      quantity: item.quantity,
    }));

    // If no items were explicitly staged, but user picked a product, auto-stage it
    if (itemsToLog.length === 0 && selectedProductId && itemQuantity > 0) {
      itemsToLog = [{ product_id: selectedProductId, quantity: itemQuantity }];
    }

    if (itemsToLog.length === 0) return;

    await onSaveDebt({
      customer_name: customerName.trim(),
      items: itemsToLog,
    });

    // Reset all form states on success
    setCustomerName("");
    setStagedItems([]);
    setSelectedProductId(null);
    setItemQuantity(1);
    setProductSearch("");
  };

  return (
    <Card className="rounded-xl border-zinc-200 bg-white shadow-2xs">
      <CardHeader className="p-4 pb-3 border-b border-zinc-100 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center">
            <BookUser className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold text-zinc-900">
              Quick Log Customer Debt
            </CardTitle>
            <CardDescription className="text-xs text-zinc-500">
              Record one or multiple items taken on store credit under a customer&apos;s account
            </CardDescription>
          </div>
        </div>

        {stagedItems.length > 0 && (
          <Badge
            variant="outline"
            className="font-mono text-xs px-2.5 py-1 bg-zinc-50 text-zinc-800 border-zinc-200 font-bold"
          >
            {stagedItems.length} {stagedItems.length === 1 ? "item" : "items"} (₱{totalAmount.toFixed(2)})
          </Badge>
        )}
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer Name Field */}
          <div>
            <label className="text-xs font-semibold text-zinc-700 block mb-1">
              Customer Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative max-w-md">
              <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <Input
                type="text"
                required
                placeholder="e.g. Maria Santos, John Doe"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="pl-8 h-9 text-xs bg-white"
              />
            </div>
          </div>

          {/* Item Selection & Add Bar */}
          <div className="pt-2 border-t border-zinc-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-zinc-900 font-mono uppercase">
                Add Items to Credit
              </span>
              <span className="text-[11px] text-zinc-400">
                You can add multiple items before saving
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
              {/* Product Select with stock preview */}
              <div className="sm:col-span-6 md:col-span-7">
                <label className="text-[10px] font-semibold text-zinc-500 block mb-1">
                  Product
                </label>
                <select
                  value={selectedProductId || ""}
                  onChange={(e) => setSelectedProductId(parseInt(e.target.value) || null)}
                  className="w-full h-9 px-3 rounded-lg text-xs bg-white border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose a store product...</option>
                  {filteredProducts.map((p) => {
                    const price = parseFloat(p.selling_price).toFixed(2);
                    return (
                      <option key={p.id} value={p.id} disabled={p.stock_quantity <= 0}>
                        {p.name} — ₱{price} ({p.stock_quantity} {p.unit} left) {p.stock_quantity <= 0 ? "[OUT OF STOCK]" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Quantity Counter */}
              <div className="sm:col-span-3 md:col-span-3">
                <label className="text-[10px] font-semibold text-zinc-500 block mb-1">
                  Quantity
                </label>
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => setItemQuantity((prev) => Math.max(1, prev - 1))}
                    disabled={itemQuantity <= 1}
                    className="h-9 w-9 flex items-center justify-center border border-zinc-200 border-r-0 rounded-l-lg bg-zinc-50 hover:bg-zinc-100 text-zinc-600 disabled:opacity-50"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <Input
                    type="number"
                    min="1"
                    max={currentSelectedProduct?.stock_quantity ?? 999}
                    value={itemQuantity}
                    onChange={(e) => setItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="h-9 rounded-none text-center font-mono font-bold text-xs bg-white focus:ring-0"
                  />
                  <button
                    type="button"
                    onClick={() => setItemQuantity((prev) => prev + 1)}
                    disabled={Boolean(currentSelectedProduct && itemQuantity >= currentSelectedProduct.stock_quantity)}
                    className="h-9 w-9 flex items-center justify-center border border-zinc-200 border-l-0 rounded-r-lg bg-zinc-50 hover:bg-zinc-100 text-zinc-600 disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Add Item Button */}
              <div className="sm:col-span-3 md:col-span-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddItem}
                  disabled={!selectedProductId || itemQuantity <= 0}
                  className="w-full h-9 text-xs border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-800 font-semibold gap-1 whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Item</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Staged Items List */}
          {stagedItems.length > 0 ? (
            <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white">
              <div className="bg-zinc-50 px-3.5 py-2 border-b border-zinc-200 flex items-center justify-between text-[11px] font-mono font-semibold text-zinc-600">
                <span>Staged Items ({stagedItems.length})</span>
                <span>Subtotal</span>
              </div>

              <div className="divide-y divide-zinc-100 max-h-60 overflow-y-auto">
                {stagedItems.map((item) => {
                  const unitPrice = parseFloat(item.product.selling_price);
                  const subtotal = unitPrice * item.quantity;
                  const isMaxStock = item.quantity >= item.product.stock_quantity;

                  return (
                    <div
                      key={item.product.id}
                      className="p-3 flex items-center justify-between gap-3 text-xs hover:bg-zinc-50/50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold text-zinc-900 block truncate">
                          {item.product.name}
                        </span>
                        <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono mt-0.5">
                          <span>₱{unitPrice.toFixed(2)} / {item.product.unit}</span>
                          <span>•</span>
                          <span>Available: {item.product.stock_quantity}</span>
                        </div>
                      </div>

                      {/* Quantity Controller */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="flex items-center border border-zinc-200 rounded-lg overflow-hidden h-7">
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(item.product.id, -1)}
                            className="w-6 h-full flex items-center justify-center bg-zinc-50 hover:bg-zinc-100 text-zinc-600"
                            title="Decrease"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            max={item.product.stock_quantity}
                            value={item.quantity}
                            onChange={(e) =>
                              handleSetExactQuantity(
                                item.product.id,
                                parseInt(e.target.value) || 1
                              )
                            }
                            className="w-10 h-full text-center font-mono font-bold text-xs border-0 focus:outline-none bg-white"
                          />
                          <button
                            type="button"
                            disabled={isMaxStock}
                            onClick={() => handleUpdateQuantity(item.product.id, 1)}
                            className="w-6 h-full flex items-center justify-center bg-zinc-50 hover:bg-zinc-100 text-zinc-600 disabled:opacity-40"
                            title="Increase"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Subtotal */}
                        <span className="font-mono font-bold text-zinc-900 text-xs w-20 text-right">
                          ₱{subtotal.toFixed(2)}
                        </span>

                        {/* Remove item button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.product.id)}
                          className="p-1 text-zinc-400 hover:text-rose-600 rounded transition-colors ml-1"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total & Action Footer Bar */}
              <div className="p-3.5 bg-zinc-50 border-t border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-mono uppercase text-zinc-500">
                    Total Debt:
                  </span>
                  <span className="text-xl font-black font-mono text-zinc-900">
                    ₱{totalAmount.toFixed(2)}
                  </span>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    ({stagedItems.length} {stagedItems.length === 1 ? "item" : "items"}, {totalItemPieces} pcs)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAll}
                    className="text-xs h-9 text-zinc-500 hover:text-zinc-800"
                  >
                    Clear All
                  </Button>

                  <Button
                    type="submit"
                    disabled={isSaving || !customerName.trim() || stagedItems.length === 0}
                    className="h-9 px-4 text-xs bg-zinc-900 hover:bg-zinc-800 text-white font-semibold rounded-lg shadow-sm gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>
                      {isSaving ? "Saving Debt..." : `Log Debt (₱${totalAmount.toFixed(2)})`}
                    </span>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-zinc-500">
                <ShoppingCart className="w-4 h-4 text-zinc-400 shrink-0" />
                {currentSelectedProduct ? (
                  <span>
                    Selected product: <strong className="text-zinc-900">{currentSelectedProduct.name}</strong> ({itemQuantity}x = ₱{totalAmount.toFixed(2)}). Click <strong>&quot;+ Add Item&quot;</strong> to add more, or log directly.
                  </span>
                ) : (
                  <span>
                    No items staged yet. Select a product above and click <strong>&quot;+ Add Item&quot;</strong> to stage multiple items before saving.
                  </span>
                )}
              </div>

              {/* Quick 1-Item Submit Button */}
              <Button
                type="submit"
                disabled={isSaving || !customerName.trim() || !selectedProductId}
                className="h-9 px-4 text-xs bg-zinc-900 hover:bg-zinc-800 text-white font-semibold rounded-lg shrink-0 gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>
                  {isSaving ? "Saving..." : selectedProductId ? `Log Debt (₱${totalAmount.toFixed(2)})` : "Log Debt"}
                </span>
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
