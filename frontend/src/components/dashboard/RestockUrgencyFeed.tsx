"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Product } from "@/types/inventory";

interface RestockUrgencyFeedProps {
  lowStockItems: Product[];
  onRestock: (product: Product, quantity: number) => void;
}

export function RestockUrgencyFeed({ lowStockItems, onRestock }: RestockUrgencyFeedProps) {
  return (
    <Card className="shadow-2xs border-zinc-200">
      <CardHeader className="p-4 pb-3 border-b border-zinc-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
            <div>
              <CardTitle className="text-xs font-bold text-zinc-900">
                Restock Urgency
              </CardTitle>
              <CardDescription className="text-[10px]">
                Items at or below reorder threshold
              </CardDescription>
            </div>
          </div>
          <Badge
            variant={lowStockItems.length > 0 ? "destructive" : "secondary"}
            className="font-mono text-[10px]"
          >
            {lowStockItems.length}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-2.5">
        {lowStockItems.length === 0 ? (
          <div className="p-4 text-center text-zinc-400 space-y-1">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
            <p className="text-xs font-semibold text-zinc-700">All stocks healthy</p>
            <p className="text-[10px] text-zinc-400">No items need replenishment right now.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {lowStockItems.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="p-2.5 rounded-lg bg-rose-50/50 border border-rose-100 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-zinc-900 block truncate">
                    {item.name}
                  </span>
                  <span className="text-[10px] font-mono text-rose-600 block">
                    {item.stock_quantity} {item.unit} left (Min: {item.reorder_level})
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRestock(item, 10)}
                  className="h-6 text-[10px] px-2 border-rose-200 text-rose-700 hover:bg-rose-100 font-mono shrink-0"
                  title="Quick restock +10"
                >
                  +10 Restock
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
