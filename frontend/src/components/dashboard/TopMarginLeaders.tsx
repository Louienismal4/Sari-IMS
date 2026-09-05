"use client";

import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Product } from "@/types/inventory";

interface MarginLeaderProduct extends Product {
  tubo: number;
  marginPct: number;
}

interface TopMarginLeadersProps {
  topMarginProducts: MarginLeaderProduct[];
}

export function TopMarginLeaders({ topMarginProducts }: TopMarginLeadersProps) {
  return (
    <Card className="shadow-2xs border-zinc-200">
      <CardHeader className="p-4 pb-3 border-b border-zinc-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
          <div>
            <CardTitle className="text-xs font-bold text-zinc-900">
              Top Margin Leaders
            </CardTitle>
            <CardDescription className="text-[10px]">
              Highest percentage markup items
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-2">
        {topMarginProducts.length === 0 ? (
          <p className="text-xs text-zinc-400 text-center py-2">No pricing data available.</p>
        ) : (
          topMarginProducts.map((item, idx) => (
            <div
              key={item.id}
              className="p-2 rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-between text-xs"
            >
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] text-zinc-400">#{idx + 1}</span>
                  <span className="font-semibold text-zinc-900 truncate block">
                    {item.name}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-400 font-mono block pl-4">
                  ₱{parseFloat(item.cost_price).toFixed(2)} → ₱{parseFloat(item.selling_price).toFixed(2)}
                </span>
              </div>
              <div className="text-right shrink-0">
                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 font-mono text-[10px]">
                  +{item.marginPct.toFixed(0)}%
                </Badge>
                <span className="text-[9px] text-emerald-600 font-mono block mt-0.5">
                  +₱{item.tubo.toFixed(2)}/pc
                </span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
