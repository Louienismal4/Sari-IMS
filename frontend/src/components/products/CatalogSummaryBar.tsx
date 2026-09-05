"use client";

interface CatalogSummaryBarProps {
  totalSKUs: number;
  totalUnits: number;
  totalCapital: number;
  totalRevenue: number;
  totalTubo: number;
  overallMargin: string;
}

export function CatalogSummaryBar({
  totalSKUs,
  totalUnits,
  totalCapital,
  totalRevenue,
  totalTubo,
  overallMargin,
}: CatalogSummaryBarProps) {
  if (totalSKUs === 0) return null;

  return (
    <div className="p-3 bg-zinc-50/90 border-t border-zinc-200 shrink-0 flex flex-wrap items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
          Catalog Valuation:
        </span>
        <span className="font-semibold text-zinc-900 text-xs">
          {totalSKUs} SKUs ({totalUnits} total units)
        </span>
      </div>

      <div className="flex items-center gap-4 font-mono">
        <div>
          <span className="text-[10px] text-zinc-400 block font-sans">Total Puhunan</span>
          <span className="text-zinc-600 font-semibold text-xs">
            ₱{totalCapital.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        <div>
          <span className="text-[10px] text-zinc-400 block font-sans">Total Sales Value</span>
          <span className="text-zinc-900 font-bold text-xs">
            ₱{totalRevenue.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        <div>
          <span className="text-[10px] text-emerald-600 block font-sans font-semibold">
            Total Projected Tubo
          </span>
          <span className="text-emerald-600 font-bold text-xs">
            +₱{totalTubo.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({overallMargin}%)
          </span>
        </div>
      </div>
    </div>
  );
}
