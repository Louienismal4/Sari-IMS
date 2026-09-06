"use client";

import { useState } from "react";
import {
  User,
  Phone,
  Calendar,
  Check,
  Package,
  Receipt,
  AlertCircle,
  FileText,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DebtorSummary, Sale } from "@/types/inventory";
import { cn } from "@/lib/utils";

interface DebtorHistoryModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  debtor: DebtorSummary | null;
  onSettleDebt: (sale: Sale) => Promise<void>;
  settlingId: number | null;
}

export function DebtorHistoryModal({
  isOpen,
  onOpenChange,
  debtor,
  onSettleDebt,
  settlingId,
}: DebtorHistoryModalProps) {
  const [filter, setFilter] = useState<"all" | "unpaid" | "settled">("all");
  const [isSettlingAll, setIsSettlingAll] = useState(false);

  if (!debtor) return null;

  // Filter transactions
  const displayedDebts = debtor.debts.filter((d) => {
    if (filter === "unpaid") return d.payment_status === "unpaid";
    if (filter === "settled") return d.payment_status === "paid";
    return true;
  });

  const unpaidDebts = debtor.debts.filter((d) => d.payment_status === "unpaid");

  // Settle all unpaid debts sequentially
  const handleSettleAll = async () => {
    if (unpaidDebts.length === 0 || isSettlingAll) return;
    setIsSettlingAll(true);
    try {
      for (const debt of unpaidDebts) {
        await onSettleDebt(debt);
      }
    } finally {
      setIsSettlingAll(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-5 pb-4 border-b border-zinc-100 bg-white sticky top-0 z-10">
          <div className="flex items-start justify-between gap-3 pr-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-zinc-900 text-white font-bold text-sm flex items-center justify-center shrink-0">
                {debtor.name ? debtor.name.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-zinc-900 flex items-center gap-2">
                  <span>{debtor.name}</span>
                  {debtor.unpaidCount > 0 ? (
                    <Badge
                      variant="outline"
                      className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-mono font-medium"
                    >
                      {debtor.unpaidCount} Unpaid
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-mono font-medium"
                    >
                      All Settled
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-500 mt-0.5 flex items-center gap-2">
                  <span>Store Credit &amp; Debt Transaction Ledger</span>
                  {debtor.phone && (
                    <span className="flex items-center gap-1 font-mono text-zinc-600 bg-zinc-100 px-1.5 py-0.5 rounded text-[11px]">
                      <Phone className="w-3 h-3 text-zinc-400" />
                      {debtor.phone}
                    </span>
                  )}
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-zinc-100">
            <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200/80">
              <span className="text-[10px] uppercase font-mono text-zinc-500 block">
                Outstanding Balance
              </span>
              <span
                className={cn(
                  "text-lg font-black font-mono mt-0.5 block",
                  debtor.totalUnpaidAmount > 0 ? "text-rose-600" : "text-zinc-700"
                )}
              >
                ₱{debtor.totalUnpaidAmount.toFixed(2)}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200/80">
              <span className="text-[10px] uppercase font-mono text-zinc-500 block">
                Total Settled
              </span>
              <span className="text-lg font-black font-mono text-emerald-600 mt-0.5 block">
                ₱{debtor.totalPaidAmount.toFixed(2)}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200/80">
              <span className="text-[10px] uppercase font-mono text-zinc-500 block">
                Lifetime Credit
              </span>
              <span className="text-lg font-black font-mono text-zinc-900 mt-0.5 block">
                ₱{debtor.totalAmount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center justify-between pt-3 mt-1">
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="sm"
                variant={filter === "all" ? "default" : "outline"}
                onClick={() => setFilter("all")}
                className="h-7 text-xs px-2.5 rounded-lg"
              >
                All ({debtor.totalDebtsCount})
              </Button>
              <Button
                type="button"
                size="sm"
                variant={filter === "unpaid" ? "default" : "outline"}
                onClick={() => setFilter("unpaid")}
                className="h-7 text-xs px-2.5 rounded-lg"
              >
                Unpaid ({debtor.unpaidCount})
              </Button>
              <Button
                type="button"
                size="sm"
                variant={filter === "settled" ? "default" : "outline"}
                onClick={() => setFilter("settled")}
                className="h-7 text-xs px-2.5 rounded-lg"
              >
                Settled ({debtor.paidCount})
              </Button>
            </div>

            <span className="text-[11px] text-zinc-400 font-mono">
              Showing {displayedDebts.length} {displayedDebts.length === 1 ? "record" : "records"}
            </span>
          </div>
        </DialogHeader>

        {/* Scrollable Debt List Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5 bg-slate-50/50">
          {displayedDebts.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-zinc-200 flex flex-col items-center justify-center">
              <AlertCircle className="w-8 h-8 text-zinc-300 mb-2" />
              <p className="text-xs font-semibold text-zinc-700">No records for this filter</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {filter === "unpaid"
                  ? "This customer currently has no unpaid debt records."
                  : "No settled debt records found."}
              </p>
            </div>
          ) : (
            displayedDebts.map((debt) => {
              const isUnpaid = debt.payment_status === "unpaid";
              const dateStr = debt.created_at
                ? new Date(debt.created_at).toLocaleDateString("en-PH", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—";

              const settledStr = debt.settled_at
                ? new Date(debt.settled_at).toLocaleDateString("en-PH", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : null;

              return (
                <div
                  key={debt.id}
                  className={cn(
                    "rounded-xl border bg-white p-4 shadow-2xs transition-all space-y-3",
                    isUnpaid ? "border-amber-200/80 bg-white" : "border-zinc-200 bg-white"
                  )}
                >
                  {/* Top Bar of Card: Ref, Date, Amount, Status & Action */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-zinc-100">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-zinc-100 text-zinc-600 flex items-center justify-center shrink-0">
                        <Receipt className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-xs text-zinc-900">
                            #{debt.invoice_number}
                          </span>
                          {isUnpaid ? (
                            <Badge
                              variant="outline"
                              className="bg-amber-50 text-amber-800 border-amber-300 text-[10px] font-mono py-0"
                            >
                              Unpaid
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] font-mono py-0"
                            >
                              Settled
                            </Badge>
                          )}
                        </div>
                        <span className="text-[11px] text-zinc-400 font-mono flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-zinc-400" />
                          {dateStr}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <div className="text-right">
                        <span className="text-[10px] text-zinc-400 uppercase font-mono block">
                          Amount
                        </span>
                        <span
                          className={cn(
                            "font-mono font-black text-sm",
                            isUnpaid ? "text-rose-600" : "text-zinc-900"
                          )}
                        >
                          ₱{debt.total_amount.toFixed(2)}
                        </span>
                      </div>

                      {isUnpaid ? (
                        <Button
                          type="button"
                          size="sm"
                          disabled={settlingId === debt.id || isSettlingAll}
                          onClick={() => onSettleDebt(debt)}
                          className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1 font-medium rounded-lg shadow-sm"
                        >
                          {settlingId === debt.id ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Settling...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Settle</span>
                            </>
                          )}
                        </Button>
                      ) : (
                        <div className="text-right text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                          <span>✓ Paid {settledStr ? `(${settledStr})` : ""}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Items Breakdown Section */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-mono font-semibold text-zinc-500">
                      <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-zinc-400">
                        <Package className="w-3 h-3 text-zinc-400" />
                        Items Taken on Credit ({debt.items?.length || 0})
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-zinc-400">Subtotal</span>
                    </div>

                    <div className="bg-zinc-50/80 rounded-lg p-2 border border-zinc-200/60 divide-y divide-zinc-100">
                      {debt.items && debt.items.length > 0 ? (
                        debt.items.map((item) => (
                          <div
                            key={item.id}
                            className="py-1.5 first:pt-0.5 last:pb-0.5 flex items-center justify-between text-xs"
                          >
                            <div className="min-w-0 pr-2">
                              <span className="font-medium text-zinc-900 block truncate">
                                {item.product_name}
                              </span>
                              <span className="text-[11px] text-zinc-400 font-mono">
                                {item.quantity} {item.unit || "pcs"} × ₱{item.unit_price.toFixed(2)}
                              </span>
                            </div>
                            <span className="font-mono font-bold text-zinc-800 text-xs shrink-0">
                              ₱{item.subtotal.toFixed(2)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="py-1 text-xs text-zinc-400 italic">
                          No item details recorded for this entry
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Optional Notes */}
                  {debt.notes && (
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-600 bg-amber-50/60 px-2.5 py-1.5 rounded-lg border border-amber-200/50">
                      <FileText className="w-3 h-3 text-amber-600 shrink-0" />
                      <span className="italic">{debt.notes}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 bg-white border-t border-zinc-100 flex items-center justify-between sm:justify-between w-full">
          <div>
            {unpaidDebts.length > 1 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isSettlingAll || settlingId !== null}
                onClick={handleSettleAll}
                className="h-9 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200 font-semibold gap-1.5"
              >
                {isSettlingAll ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Settling all {unpaidDebts.length} debts...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Settle All Unpaid ({unpaidDebts.length} debts — ₱{debtor.totalUnpaidAmount.toFixed(2)})</span>
                  </>
                )}
              </Button>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-9 px-4 text-xs font-semibold"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
