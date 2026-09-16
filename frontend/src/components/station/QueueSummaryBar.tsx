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
    <div className="p-3 sm:p-3.5 bg-zinc-50/90 border-t border-zinc-200 shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 text-xs">
      <div className="flex items-center justify-between sm:justify-start gap-2">
        <span className="text-[11px] sm:text-xs font-bold text-zinc-500 uppercase tracking-wider font-mono">
          Queue Summary:
        </span>
        <span className="font-semibold text-zinc-900 text-xs">
          {scannedItems.length} SKUs ({queueTotalUnits} total units)
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 font-mono sm:flex sm:items-center sm:gap-4 text-left sm:text-right">
        <div className="bg-white sm:bg-transparent p-2 sm:p-0 rounded-lg sm:rounded-none border border-zinc-200 sm:border-0 shadow-2xs sm:shadow-none">
          <span className="text-[10px] sm:text-xs text-zinc-500 block font-sans">Total Cost</span>
          <span className="text-zinc-700 font-semibold text-xs truncate block">
            ₱{queueTotalCost.toFixed(2)}
          </span>
        </div>

        <div className="bg-white sm:bg-transparent p-2 sm:p-0 rounded-lg sm:rounded-none border border-zinc-200 sm:border-0 shadow-2xs sm:shadow-none">
          <span className="text-[10px] sm:text-xs text-zinc-500 block font-sans">Est. Sales</span>
          <span className="text-zinc-900 font-bold text-xs truncate block">
            ₱{queueTotalRetail.toFixed(2)}
          </span>
        </div>

        <div className="bg-white sm:bg-transparent p-2 sm:p-0 rounded-lg sm:rounded-none border border-zinc-200 sm:border-0 shadow-2xs sm:shadow-none">
          <span className="text-[10px] sm:text-xs text-emerald-700 block font-sans font-semibold">
            Est. Profit
          </span>
          <span className="text-emerald-600 font-bold text-xs truncate block">
            +₱{queueTotalProfit.toFixed(2)}
          </span>
          <span className="text-[10px] text-emerald-700 block sm:hidden">
            ({queueOverallMargin}%)
          </span>
        </div>
      </div>
    </div>
  );
}
