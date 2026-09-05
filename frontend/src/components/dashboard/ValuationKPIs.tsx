"use client";

import { Coins, ShoppingBag, TrendingUp, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ValuationKPIsProps {
  totalCapital: number;
  totalRevenue: number;
  totalTubo: number;
  overallMargin: string;
  totalProductsCount: number;
  totalPhysicalUnits: number;
  lowStockCount: number;
}

export function ValuationKPIs({
  totalCapital,
  totalRevenue,
  totalTubo,
  overallMargin,
  totalProductsCount,
  totalPhysicalUnits,
  lowStockCount,
}: ValuationKPIsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Capital */}
      <Card className="shadow-2xs border-zinc-200">
        <CardContent className="p-4 space-y-1">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">
              Total Puhunan
            </span>
            <div className="w-7 h-7 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center">
              <Coins className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-zinc-900 tracking-tight">
            ₱{totalCapital.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-zinc-400">
            Total capital locked in {totalPhysicalUnits} physical units
          </p>
        </CardContent>
      </Card>

      {/* Expected Sales */}
      <Card className="shadow-2xs border-zinc-200">
        <CardContent className="p-4 space-y-1">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">
              Expected Sales
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShoppingBag className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-zinc-900 tracking-tight">
            ₱{totalRevenue.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-zinc-400">
            Gross revenue once on-shelf stock sells out
          </p>
        </CardContent>
      </Card>

      {/* Projected Tubo */}
      <Card className="shadow-2xs border-emerald-200/80 bg-emerald-50/20">
        <CardContent className="p-4 space-y-1">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">
              Projected Tubo
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 tracking-tight">
            +₱{totalTubo.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-mono">
            <span className="font-bold">+{overallMargin}% overall markup</span>
          </div>
        </CardContent>
      </Card>

      {/* Stock Health */}
      <Card className={`shadow-2xs border-zinc-200 ${lowStockCount > 0 ? "border-rose-200 bg-rose-50/30" : ""}`}>
        <CardContent className="p-4 space-y-1">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">
              Stock Health
            </span>
            {lowStockCount > 0 ? (
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-rose-100 text-rose-800">
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
            ) : (
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-zinc-100 text-zinc-800">
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-zinc-900 tracking-tight">
            {lowStockCount > 0 ? (
              <span className="text-rose-600">{lowStockCount} SKUs Low</span>
            ) : (
              <span className="text-emerald-600">All Good</span>
            )}
          </div>
          <p className="text-[11px] text-zinc-400">
            {totalProductsCount} registered products in catalog
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
