"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Category, Product } from "@/types/inventory";

interface CategoryBreakdownProps {
  categories: Category[];
  products: Product[];
  activeCategory: number | string;
  onSelectCategory: (id: number | "all") => void;
}

export function CategoryBreakdown({
  categories,
  products,
  activeCategory,
  onSelectCategory,
}: CategoryBreakdownProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono">
          Category Breakdown
        </h3>
        <span className="text-xs text-zinc-400 font-mono">
          {categories.length} categories
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {categories.map((cat) => {
          const catProducts = products.filter(
            (p) => p.category?.id === cat.id || p.category_id === cat.id
          );
          const catValuation = catProducts.reduce(
            (sum, p) => sum + (parseFloat(p.selling_price) || 0) * (p.stock_quantity || 0),
            0
          );
          const catItemsCount = catProducts.length;

          return (
            <Card
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`p-3 cursor-pointer transition-all hover:border-zinc-400 shadow-2xs ${
                activeCategory === cat.id
                  ? "border-zinc-900 bg-zinc-100/60"
                  : "border-zinc-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-zinc-900 truncate">{cat.name}</span>
                <Badge variant="outline" className="text-[9px] px-1 font-mono">
                  {catItemsCount} SKUs
                </Badge>
              </div>
              <div className="text-[11px] font-mono text-zinc-500">
                ₱{catValuation.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} value
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
