"use client";

import { useMemo, useState } from "react";
import { ShoppingCart, Copy, Check, AlertTriangle, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Product } from "@/types/inventory";

interface ReorderShoppingListCardProps {
  products: Product[];
}

export function ReorderShoppingListCard({ products }: ReorderShoppingListCardProps) {
  const [copied, setCopied] = useState(false);

  // Products currently at or below reorder level
  const lowStockItems = useMemo(() => {
    return products
      .filter((p) => p.stock_quantity <= p.reorder_level)
      .sort((a, b) => a.stock_quantity - b.stock_quantity);
  }, [products]);

  // Copy shopping list to clipboard
  const handleCopyList = () => {
    if (lowStockItems.length === 0) return;

    const lines = lowStockItems.map(
      (p) =>
        `• ${p.name} - Remaining: ${p.stock_quantity} ${p.unit} (Reorder Min: ${p.reorder_level})`
    );
    const text = `Sari-Sari Store Restock List (${new Date().toLocaleDateString("en-PH")}):\n\n${lines.join(
      "\n"
    )}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (lowStockItems.length === 0) {
    return null; // Don't take up space if all stock is healthy
  }

  return (
    <Card className="rounded-xl border-zinc-200 bg-white shadow-2xs">
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center">
            <ShoppingCart className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold text-zinc-900">
              Wholesaler &amp; Puregold Restock List
            </CardTitle>
            <CardDescription className="text-xs text-zinc-500">
              {lowStockItems.length} {lowStockItems.length === 1 ? "item needs" : "items need"} replenishment before running out
            </CardDescription>
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleCopyList}
          className="text-xs h-8 gap-1.5 bg-white border-zinc-200 text-zinc-700 hover:text-zinc-900"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Copied to clipboard!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy List</span>
            </>
          )}
        </Button>
      </CardHeader>

      <CardContent className="p-4 pt-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
          {lowStockItems.map((item) => (
            <div
              key={item.id}
              className="p-2.5 rounded-lg border border-zinc-200 bg-white flex items-center justify-between text-xs"
            >
              <div className="truncate pr-2">
                <span className="font-semibold text-zinc-900 block truncate">
                  {item.name}
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {item.category?.name || "Uncategorized"}
                </span>
              </div>

              <div className="text-right shrink-0">
                <Badge
                  variant="outline"
                  className={`text-[10px] font-mono font-bold ${
                    item.stock_quantity === 0
                      ? "bg-rose-50 text-rose-700 border-rose-300"
                      : "bg-amber-50 text-amber-800 border-amber-300"
                  }`}
                >
                  {item.stock_quantity} left
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
