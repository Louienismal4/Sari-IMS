"use client";

import { History, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StockMovement } from "@/types/inventory";

interface ActivityLedgerProps {
  recentMovements: StockMovement[];
}

export function ActivityLedger({ recentMovements }: ActivityLedgerProps) {
  return (
    <Card className="shadow-2xs border-zinc-200">
      <CardHeader className="p-4 pb-3 border-b border-zinc-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center">
            <History className="w-3.5 h-3.5" />
          </div>
          <div>
            <CardTitle className="text-xs font-bold text-zinc-900">
              Recent Activity Ledger
            </CardTitle>
            <CardDescription className="text-[10px]">
              Live restocks, sales and inventory changes
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-2">
        {recentMovements.length === 0 ? (
          <p className="text-xs text-zinc-400 text-center py-2">No recent movements recorded.</p>
        ) : (
          recentMovements.slice(0, 6).map((m) => {
            const isPositive = m.quantity_change > 0;
            const dateStr = new Date(m.created_at).toLocaleTimeString("en-PH", {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={m.id}
                className="flex items-center justify-between text-xs py-1.5 border-b border-zinc-100 last:border-0"
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  {isPositive ? (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-emerald-100 text-emerald-800">
                      <ArrowUpRight className="w-3 h-3" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-zinc-200 text-zinc-800">
                      <ArrowDownRight className="w-3 h-3" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="font-semibold text-zinc-800 truncate block text-[11px]">
                      {m.product?.name || `Product #${m.product_id}`}
                    </span>
                    <span className="text-[9px] text-zinc-400 font-mono block">
                      {m.notes || m.type} • {dateStr}
                    </span>
                  </div>
                </div>
                <span
                  className={`font-mono font-bold text-xs shrink-0 ${
                    isPositive ? "text-emerald-600" : "text-zinc-700"
                  }`}
                >
                  {isPositive ? `+${m.quantity_change}` : m.quantity_change}
                </span>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
