"use client";

import { CheckCircle2, TrendingUp, DollarSign, Package, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StockAudit } from "@/types/inventory";

interface AuditSummaryReportModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  audit: StockAudit | null;
}

export function AuditSummaryReportModal({
  isOpen,
  onOpenChange,
  audit,
}: AuditSummaryReportModalProps) {
  if (!audit) return null;

  const items = audit.items || [];
  const topSellers = [...items]
    .sort((a, b) => b.units_sold - a.units_sold)
    .filter((it) => it.units_sold > 0)
    .slice(0, 5);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-zinc-100 text-zinc-900 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                Weekly Audit Summary &amp; Reconciliation
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500">
                Audit reference #{audit.audit_code}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Main Scorecard Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Total Units Sold */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3">
              <span className="text-[11px] font-mono uppercase text-zinc-500">Units Sold</span>
              <p className="text-2xl font-black text-zinc-900 font-mono mt-0.5">
                {audit.total_units_sold}
              </p>
              <span className="text-[10px] text-zinc-400">Total items sold</span>
            </div>

            {/* Estimated Gross Revenue */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3">
              <span className="text-[11px] font-mono uppercase text-zinc-500">Est. Benta</span>
              <p className="text-2xl font-black text-zinc-900 font-mono mt-0.5">
                ₱{audit.total_expected_revenue.toFixed(2)}
              </p>
              <span className="text-[10px] text-zinc-400">Expected sales collected</span>
            </div>

            {/* Estimated Tubo */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 col-span-2 sm:col-span-1">
              <span className="text-[11px] font-mono uppercase text-zinc-500">Est. Tubo (Profit)</span>
              <p className="text-2xl font-black text-zinc-900 font-mono mt-0.5">
                ₱{audit.total_gross_profit.toFixed(2)}
              </p>
              <span className="text-[10px] text-zinc-400">Net markup earned</span>
            </div>
          </div>

          {/* Top Selling Products This Period */}
          {topSellers.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-xs font-bold uppercase font-mono text-zinc-600">
                Top Movers (Mabenta Ngayong Linggo)
              </h5>
              <div className="space-y-1.5">
                {topSellers.map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-100 bg-white text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-zinc-100 text-zinc-600 font-mono font-bold flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-zinc-900">{item.product_name}</span>
                    </div>

                    <div className="text-right font-mono">
                      <span className="font-bold text-emerald-700">
                        {item.units_sold} {item.unit} sold
                      </span>
                      <span className="text-zinc-400 text-[11px] ml-2">
                        (₱{item.subtotal_revenue.toFixed(2)})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Verification Notice */}
          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-500 flex items-start gap-2">
            <Package className="w-4 h-4 shrink-0 text-zinc-400 mt-0.5" />
            <p>
              Store inventory counts have been successfully updated to match your physical shelf count.
              The calculated sales and profits are recorded in your store ledger.
            </p>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
