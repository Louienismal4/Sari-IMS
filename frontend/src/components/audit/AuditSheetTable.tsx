"use client";

import { useState, useMemo } from "react";
import { Search, CheckCircle2, AlertTriangle, Plus, Minus, Check, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AuditSheetItem } from "@/types/inventory";

interface AuditSheetTableProps {
  items: AuditSheetItem[];
  counts: Record<number, number>;
  discrepancies: Record<number, string>;
  onCountChange: (productId: number, count: number) => void;
  onDiscrepancyChange: (productId: number, note: string) => void;
  onSetAllToExpected: () => void;
}

export function AuditSheetTable({
  items,
  counts,
  discrepancies,
  onCountChange,
  onDiscrepancyChange,
  onSetAllToExpected,
}: AuditSheetTableProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Extract unique category names
  const categoryNames = useMemo(() => {
    const names = Array.from(new Set(items.map((it) => it.category_name)));
    return names.sort();
  }, [items]);

  // Filter items
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();

    return items.filter((item) => {
      if (selectedCategory !== "all" && item.category_name !== selectedCategory) {
        return false;
      }

      if (!q) return true;

      const nameMatch = item.name.toLowerCase().includes(q);
      const barcodeMatch = item.barcode?.toLowerCase().includes(q) ?? false;
      const catMatch = item.category_name.toLowerCase().includes(q);

      return nameMatch || barcodeMatch || catMatch;
    });
  }, [items, search, selectedCategory]);

  return (
    <div className="space-y-3">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white p-3 rounded-xl border border-zinc-200">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items by name or barcode..."
            className="pl-9 h-9 text-xs bg-zinc-50"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onSetAllToExpected}
            className="text-xs h-9 text-zinc-600 hover:text-zinc-900 border-dashed"
          >
            Pre-fill All Expected
          </Button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <Button
          type="button"
          size="sm"
          variant={selectedCategory === "all" ? "default" : "outline"}
          onClick={() => setSelectedCategory("all")}
          className="h-7 text-xs px-3 rounded-full shrink-0 font-medium"
        >
          All Items ({items.length})
        </Button>
        {categoryNames.map((cat) => {
          const count = items.filter((it) => it.category_name === cat).length;
          return (
            <Button
              key={cat}
              type="button"
              size="sm"
              variant={selectedCategory === cat ? "default" : "outline"}
              onClick={() => setSelectedCategory(cat)}
              className="h-7 text-xs px-3 rounded-full shrink-0 font-medium"
            >
              {cat} ({count})
            </Button>
          );
        })}
      </div>

      {/* Checklist Table */}
      <Card className="rounded-xl border-zinc-200 shadow-sm overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-mono text-[11px]">
              <tr>
                <th className="py-2.5 px-4 font-semibold">Product</th>
                <th className="py-2.5 px-3 font-semibold text-center">Starting</th>
                <th className="py-2.5 px-3 font-semibold text-center text-blue-600">Restocked</th>
                <th className="py-2.5 px-3 font-semibold text-center">Expected</th>
                <th className="py-2.5 px-4 font-semibold text-center min-w-[200px]">Actual Count (Shelf)</th>
                <th className="py-2.5 px-4 font-semibold text-right">Computed Sold &amp; Benta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredItems.map((item) => {
                const physicalCount = counts[item.product_id] ?? item.suggested_physical_count;
                const available = item.starting_stock + item.restocked_quantity;
                const sold = Math.max(0, available - physicalCount);
                const benta = sold * item.selling_price;
                const tubo = sold * (item.selling_price - item.cost_price);
                const isOverExpected = physicalCount > available;

                return (
                  <tr key={item.product_id} className="hover:bg-zinc-50/60 transition-colors">
                    {/* Product Name & Category */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-zinc-900 text-sm">
                        {item.name}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono mt-0.5">
                        <span>{item.category_name}</span>
                        <span>•</span>
                        <span>₱{item.selling_price.toFixed(2)} / {item.unit}</span>
                      </div>
                    </td>

                    {/* Starting Count */}
                    <td className="py-3 px-3 text-center font-mono text-zinc-600 font-medium">
                      {item.starting_stock}
                    </td>

                    {/* Restocked Count */}
                    <td className="py-3 px-3 text-center font-mono font-medium">
                      {item.restocked_quantity > 0 ? (
                        <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-bold">
                          +{item.restocked_quantity}
                        </span>
                      ) : (
                        <span className="text-zinc-300">0</span>
                      )}
                    </td>

                    {/* Expected Total */}
                    <td className="py-3 px-3 text-center font-mono font-bold text-zinc-800">
                      {available}
                    </td>

                    {/* Shelf Physical Counter Input */}
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* -5 and -1 buttons */}
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => onCountChange(item.product_id, Math.max(0, physicalCount - 5))}
                            className="h-7 px-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded text-[10px] font-mono font-bold"
                          >
                            -5
                          </button>
                          <button
                            type="button"
                            onClick={() => onCountChange(item.product_id, Math.max(0, physicalCount - 1))}
                            className="h-7 w-7 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded flex items-center justify-center text-xs font-bold"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Direct input */}
                        <input
                          type="number"
                          min="0"
                          value={physicalCount}
                          onChange={(e) => onCountChange(item.product_id, Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-14 h-8 text-center font-mono font-extrabold text-sm bg-white border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />

                        {/* +1 and +5 buttons */}
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => onCountChange(item.product_id, physicalCount + 1)}
                            className="h-7 w-7 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded flex items-center justify-center text-xs font-bold"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onCountChange(item.product_id, physicalCount + 5)}
                            className="h-7 px-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded text-[10px] font-mono font-bold"
                          >
                            +5
                          </button>
                        </div>

                        {/* Matches expected quick button */}
                        <button
                          type="button"
                          onClick={() => onCountChange(item.product_id, available)}
                          title="Set to expected count"
                          className={`h-7 px-2 rounded text-[10px] font-medium border flex items-center gap-1 ${
                            physicalCount === available
                              ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                              : "bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50"
                          }`}
                        >
                          <Check className="w-3 h-3" />
                          <span>All</span>
                        </button>
                      </div>

                      {isOverExpected && (
                        <div className="text-[10px] text-amber-600 mt-1 text-center flex items-center justify-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Count ({physicalCount}) exceeds starting + restocks ({available})</span>
                        </div>
                      )}
                    </td>

                    {/* Computed Sold & Benta */}
                    <td className="py-3 px-4 text-right">
                      {sold > 0 ? (
                        <div>
                          <div className="font-bold text-emerald-700 font-mono text-sm">
                            +{sold} sold (₱{benta.toFixed(2)})
                          </div>
                          <div className="text-[11px] text-zinc-400 font-mono">
                            Tubo: +₱{tubo.toFixed(2)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-zinc-400 font-mono text-xs">0 sold</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
