"use client";

import { useState, useMemo } from "react";
import { Search, CheckCircle2, AlertCircle, Clock, Check, User, Calendar, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Sale } from "@/types/inventory";

interface DebtsLedgerViewProps {
  debts: Sale[];
  isLoading: boolean;
  onSettleDebt: (sale: Sale) => Promise<void>;
  settlingId: number | null;
}

export function DebtsLedgerView({
  debts,
  isLoading,
  onSettleDebt,
  settlingId,
}: DebtsLedgerViewProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"unpaid" | "paid" | "all">("unpaid");

  // Filter debts
  const filteredDebts = useMemo(() => {
    const q = search.trim().toLowerCase();

    return debts.filter((debt) => {
      if (statusFilter === "unpaid" && debt.payment_status !== "unpaid") return false;
      if (statusFilter === "paid" && debt.payment_status !== "paid") return false;

      if (!q) return true;

      const nameMatch = debt.customer_name?.toLowerCase().includes(q) ?? false;
      const invMatch = debt.invoice_number.toLowerCase().includes(q);
      const phoneMatch = debt.customer_phone?.toLowerCase().includes(q) ?? false;

      return nameMatch || invMatch || phoneMatch;
    });
  }, [debts, search, statusFilter]);

  // Outstanding total owed calculation
  const totalUnpaidAmount = useMemo(() => {
    return debts
      .filter((d) => d.payment_status === "unpaid")
      .reduce((sum, d) => sum + d.total_amount, 0);
  }, [debts]);

  const unpaidCount = useMemo(() => {
    return debts.filter((d) => d.payment_status === "unpaid").length;
  }, [debts]);

  return (
    <div className="space-y-4">
      {/* Metric & Summary Header Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-zinc-200 shadow-2xs rounded-xl p-4">
          <span className="text-xs font-medium text-zinc-500 uppercase font-mono">
            Kabuuan ng Utang (Total Unpaid)
          </span>
          <p className="text-2xl font-black text-zinc-900 font-mono mt-1">
            ₱{totalUnpaidAmount.toFixed(2)}
          </p>
          <span className="text-[11px] text-zinc-400">
            {unpaidCount} {unpaidCount === 1 ? "unsettled credit account" : "unsettled credit accounts"}
          </span>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-4 sm:col-span-2 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-zinc-900 uppercase font-mono">
              Listahan ng Utang (Store Credit Ledger)
            </h4>
            <p className="text-xs text-zinc-500 mt-0.5">
              Keep track of customers with pending balances and record one-click debt settlements.
            </p>
          </div>

          {/* Search bar & filter pills */}
          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-zinc-100 flex-wrap sm:flex-nowrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <Input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search debtor name, phone, or invoice..."
                className="pl-8 h-8 text-xs bg-zinc-50"
              />
            </div>

            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="sm"
                variant={statusFilter === "unpaid" ? "default" : "outline"}
                onClick={() => setStatusFilter("unpaid")}
                className="h-8 text-xs px-2.5 rounded-lg"
              >
                Unpaid ({unpaidCount})
              </Button>
              <Button
                type="button"
                size="sm"
                variant={statusFilter === "paid" ? "default" : "outline"}
                onClick={() => setStatusFilter("paid")}
                className="h-8 text-xs px-2.5 rounded-lg"
              >
                Settled
              </Button>
              <Button
                type="button"
                size="sm"
                variant={statusFilter === "all" ? "default" : "outline"}
                onClick={() => setStatusFilter("all")}
                className="h-8 text-xs px-2.5 rounded-lg"
              >
                All
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Debts Table / List */}
      <Card className="rounded-xl border-zinc-200 shadow-sm overflow-hidden bg-white">
        {filteredDebts.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-zinc-100 text-zinc-400 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <h4 className="text-sm font-semibold text-zinc-900">
              {statusFilter === "unpaid" ? "Walang Utang! (No pending debts)" : "No records found"}
            </h4>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm">
              {statusFilter === "unpaid"
                ? "All customers are fully paid. New credit sales logged from the counter will automatically appear here."
                : "No debtor entries match your active search or filter criteria."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-mono text-[11px]">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Customer / Debtor</th>
                  <th className="py-2.5 px-4 font-semibold">Date &amp; Ref</th>
                  <th className="py-2.5 px-4 font-semibold">Items Owed</th>
                  <th className="py-2.5 px-4 font-semibold">Notes</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Amount</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Status</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredDebts.map((debt) => {
                  const isUnpaid = debt.payment_status === "unpaid";
                  const dateStr = debt.created_at
                    ? new Date(debt.created_at).toLocaleDateString("en-PH", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—";

                  return (
                    <tr
                      key={debt.id}
                      className="hover:bg-zinc-50/60 transition-colors"
                    >
                      {/* Customer Name */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-zinc-900 text-sm flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-zinc-400" />
                          <span>{debt.customer_name || "Anonymous Customer"}</span>
                        </div>
                        {debt.customer_phone && (
                          <div className="flex items-center gap-1 text-[11px] text-zinc-400 font-mono mt-0.5">
                            <Phone className="w-3 h-3" />
                            <span>{debt.customer_phone}</span>
                          </div>
                        )}
                      </td>

                      {/* Date & Ref */}
                      <td className="py-3 px-4 font-mono text-zinc-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-zinc-400" />
                          <span>{dateStr}</span>
                        </div>
                        <span className="text-[10px] text-zinc-400">#{debt.invoice_number}</span>
                      </td>

                      {/* Items */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="space-y-0.5">
                          {debt.items && debt.items.length > 0 ? (
                            debt.items.map((it) => (
                              <div
                                key={it.id}
                                className="text-[11px] text-zinc-600 truncate flex items-center justify-between gap-2"
                              >
                                <span>{it.product_name}</span>
                                <span className="font-mono text-zinc-400 shrink-0">
                                  {it.quantity}x
                                </span>
                              </div>
                            ))
                          ) : (
                            <span className="text-zinc-400 italic">No item breakdown</span>
                          )}
                        </div>
                      </td>

                      {/* Notes */}
                      <td className="py-3 px-4 text-zinc-500 text-[11px] max-w-[150px] truncate">
                        {debt.notes || "—"}
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-sm text-zinc-900">
                        ₱{debt.total_amount.toFixed(2)}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        {isUnpaid ? (
                          <Badge
                            variant="outline"
                            className="bg-amber-50 text-amber-800 border-amber-300 text-[10px] font-mono"
                          >
                            Unpaid
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] font-mono"
                          >
                            Settled
                          </Badge>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        {isUnpaid ? (
                          <Button
                            type="button"
                            size="sm"
                            disabled={settlingId === debt.id}
                            onClick={() => onSettleDebt(debt)}
                            className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1 font-medium rounded-lg shadow-sm"
                          >
                            {settlingId === debt.id ? (
                              "Settling..."
                            ) : (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Bayaran</span>
                              </>
                            )}
                          </Button>
                        ) : (
                          <span className="text-[11px] text-zinc-400 font-mono">Paid</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
