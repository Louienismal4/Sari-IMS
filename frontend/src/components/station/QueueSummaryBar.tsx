"use client";

import { ScannedItem } from "@/types/inventory";

interface QueueSummaryBarProps {
  scannedItems: ScannedItem[];
}

export function QueueSummaryBar({ scannedItems }: QueueSummaryBarProps) {
  if (scannedItems.length === 0) return null;

  const queueTotalUnits = scannedItems.reduce(
    (acc, item) => acc + (item.stock_quantity || 1),
    0
  );
  const queueTotalCost = scannedItems.reduce(
    (acc, item) =>
      acc + (parseFloat(item.cost_price) || 0) * (item.stock_quantity || 1),
    0
  );
  const queueTotalRetail = scannedItems.reduce(
    (acc, item) =>
      acc + (parseFloat(item.selling_price) || 0) * (item.stock_quantity || 1),
    0
  );
  const queueTotalProfit = queueTotalRetail - queueTotalCost;
  const queueOverallMargin =
    queueTotalCost > 0
      ? ((queueTotalProfit / queueTotalCost) * 100).toFixed(1)
      : "0";

  return (
    <div className="p-3.5 bg-zinc-50/90 border-t border-zinc-200 shrink-0 flex flex-wrap items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider font-mono">
          Queue Summary:
        </span>
        <span className="font-semibold text-zinc-900 text-xs">
          {scannedItems.length} SKUs ({queueTotalUnits} total units)
        </span>
      </div>

      <div className="flex items-center gap-4 font-mono">
        <div>
          <span className="text-xs text-zinc-500 block font-sans">Total Cost</span>
          <span className="text-zinc-700 font-semibold text-xs">
            ₱{queueTotalCost.toFixed(2)}
          </span>
        </div>

        <div>
          <span className="text-xs text-zinc-500 block font-sans">Est. Sales</span>
          <span className="text-zinc-900 font-bold text-xs">
            ₱{queueTotalRetail.toFixed(2)}
          </span>
        </div>

        <div>
          <span className="text-xs text-emerald-700 block font-sans font-semibold">
            Est. Profit
          </span>
          <span className="text-emerald-600 font-bold text-xs">
            +₱{queueTotalProfit.toFixed(2)} ({queueOverallMargin}%)
          </span>
        </div>
      </div>
    </div>
  );
}
