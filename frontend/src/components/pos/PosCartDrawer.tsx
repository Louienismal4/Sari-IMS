"use client";

import { ShoppingBag, Trash2, Plus, Minus, Banknote, BookUser } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CartItem } from "@/types/inventory";

interface PosCartDrawerProps {
  cartItems: CartItem[];
  totalAmount: number;
  totalItemCount: number;
  onUpdateQuantity: (productId: number, newQty: number) => void;
  onRemoveItem: (productId: number) => void;
  onClearCart: () => void;
  onOpenCashModal: () => void;
  onOpenUtangModal: () => void;
}

export function PosCartDrawer({
  cartItems,
  totalAmount,
  totalItemCount,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onOpenCashModal,
  onOpenUtangModal,
}: PosCartDrawerProps) {
  const isCartEmpty = cartItems.length === 0;

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
      {/* Ticket Header */}
      <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 leading-none">Counter Ticket</h3>
            <span className="text-[11px] text-zinc-400 font-mono">
              {totalItemCount} {totalItemCount === 1 ? "item" : "items"}
            </span>
          </div>
        </div>

        {!isCartEmpty && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearCart}
            className="text-zinc-400 hover:text-rose-600 text-xs h-7 px-2"
          >
            Clear
          </Button>
        )}
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isCartEmpty ? (
          <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-4">
            <div className="w-12 h-12 rounded-full bg-zinc-100 text-zinc-400 flex items-center justify-center mb-2">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold text-zinc-600">Cart is empty</p>
            <p className="text-[11px] text-zinc-400 mt-1 max-w-[180px]">
              Click any item from the catalog or scan a barcode to begin sale
            </p>
          </div>
        ) : (
          cartItems.map((item) => (
            <div
              key={item.product.id}
              className="group p-2.5 rounded-lg border border-zinc-100 hover:border-zinc-200 bg-white transition-all space-y-2"
            >
              {/* Product title & delete */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h5 className="text-xs font-semibold text-zinc-900 leading-snug">
                    {item.product.name}
                  </h5>
                  <span className="text-[11px] font-mono text-zinc-400">
                    ₱{item.unit_price.toFixed(2)} / {item.product.unit}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveItem(item.product.id)}
                  className="text-zinc-300 hover:text-rose-500 transition-colors p-1"
                  aria-label="Remove item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Quantity steppers & subtotal */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1 bg-zinc-50 border border-zinc-200 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                    className="w-6 h-6 rounded flex items-center justify-center text-zinc-600 hover:bg-zinc-200 text-xs font-bold"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-7 text-center font-mono font-bold text-xs text-zinc-900">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    disabled={item.quantity >= item.product.stock_quantity}
                    onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                    className="w-6 h-6 rounded flex items-center justify-center text-zinc-600 hover:bg-zinc-200 disabled:opacity-30 text-xs font-bold"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <span className="text-xs font-bold font-mono text-zinc-900">
                  ₱{item.subtotal.toFixed(2)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Cart Footer Summary & Checkout Actions */}
      <div className="p-4 border-t border-zinc-200 bg-zinc-50/50 space-y-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Subtotal ({totalItemCount} pcs)</span>
            <span className="font-mono">₱{totalAmount.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-sm font-bold text-zinc-900">Total Due</span>
            <span className="text-xl font-extrabold font-mono text-zinc-900">
              ₱{totalAmount.toFixed(2)}
            </span>
          </div>
        </div>

        <Separator className="bg-zinc-200" />

        {/* Primary Checkout Actions */}
        <div className="grid grid-cols-2 gap-2">
          {/* Cash Checkout */}
          <Button
            type="button"
            disabled={isCartEmpty}
            onClick={onOpenCashModal}
            className="h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex flex-col items-center justify-center gap-0.5 rounded-xl shadow-sm active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-1.5">
              <Banknote className="w-4 h-4" />
              <span>Cash Sale</span>
            </div>
          </Button>

          {/* Store Credit Checkout */}
          <Button
            type="button"
            disabled={isCartEmpty}
            onClick={onOpenUtangModal}
            className="h-11 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs flex flex-col items-center justify-center gap-0.5 rounded-xl shadow-sm active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-1.5">
              <BookUser className="w-4 h-4" />
              <span>Store Credit</span>
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
}
