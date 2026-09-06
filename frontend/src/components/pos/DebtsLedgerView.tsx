"use client";

import { useState, useMemo } from "react";
import {
  Search,
  CheckCircle2,
  Check,
  User,
  Calendar,
  History,
  Phone,
  Layers,
  Receipt,
  Eye,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Sale, DebtorSummary } from "@/types/inventory";
import { DebtorHistoryModal } from "./DebtorHistoryModal";

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
  const [viewMode, setViewMode] = useState<"debtors" | "transactions">("debtors");

  // Selected debtor for history modal
  const [selectedDebtorKey, setSelectedDebtorKey] = useState<string | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Group debts by Debtor
  const debtors = useMemo<DebtorSummary[]>(() => {
    const map = new Map<string, DebtorSummary>();

    debts.forEach((debt) => {
      const rawName = debt.customer_name?.trim() || "Anonymous Customer";
      const debtorKey = rawName.toLowerCase();

      if (!map.has(debtorKey)) {
        map.set(debtorKey, {
          debtorKey,
          name: rawName,
          phone: debt.customer_phone || null,
          totalDebtsCount: 0,
          unpaidCount: 0,
          paidCount: 0,
          totalUnpaidAmount: 0,
          totalPaidAmount: 0,
          totalAmount: 0,
          latestDebtDate: debt.created_at,
          debts: [],
        });
      }

      const debtor = map.get(debtorKey)!;
      debtor.debts.push(debt);
      debtor.totalDebtsCount += 1;
      debtor.totalAmount += debt.total_amount;

      if (debt.payment_status === "unpaid") {
        debtor.unpaidCount += 1;
        debtor.totalUnpaidAmount += debt.total_amount;
      } else {
        debtor.paidCount += 1;
        debtor.totalPaidAmount += debt.total_amount;
      }

      // Record phone if available
      if (!debtor.phone && debt.customer_phone) {
        debtor.phone = debt.customer_phone;
      }
    });

    // Sort: debtors with active unpaid balance first, then by most recent debt date
    return Array.from(map.values()).sort((a, b) => {
      if (a.unpaidCount > 0 && b.unpaidCount === 0) return -1;
      if (a.unpaidCount === 0 && b.unpaidCount > 0) return 1;
      return new Date(b.latestDebtDate).getTime() - new Date(a.latestDebtDate).getTime();
    });
  }, [debts]);

  // Derived currently selected debtor for modal
  const activeDebtor = useMemo(() => {
    if (!selectedDebtorKey) return null;
    return debtors.find((d) => d.debtorKey === selectedDebtorKey) || null;
  }, [debtors, selectedDebtorKey]);

  // Filter debtors based on search and status filter
  const filteredDebtors = useMemo(() => {
    const q = search.trim().toLowerCase();

    return debtors.filter((debtor) => {
      if (statusFilter === "unpaid" && debtor.unpaidCount === 0) return false;
      if (statusFilter === "paid" && debtor.unpaidCount > 0) return false;

      if (!q) return true;

      const nameMatch = debtor.name.toLowerCase().includes(q);
      const phoneMatch = debtor.phone?.toLowerCase().includes(q) ?? false;
      const invMatch = debtor.debts.some((d) => d.invoice_number.toLowerCase().includes(q));

      return nameMatch || phoneMatch || invMatch;
    });
  }, [debtors, search, statusFilter]);

  // Filter individual transactions (for transactions view mode)
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

  // Outstanding totals
  const totalUnpaidAmount = useMemo(() => {
    return debts
      .filter((d) => d.payment_status === "unpaid")
      .reduce((sum, d) => sum + d.total_amount, 0);
  }, [debts]);

  const unpaidDebtorCount = useMemo(() => {
    return debtors.filter((d) => d.unpaidCount > 0).length;
  }, [debtors]);

  // Handler to open history modal
  const handleOpenDebtorHistory = (debtor: DebtorSummary) => {
    setSelectedDebtorKey(debtor.debtorKey);
    setIsHistoryModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Metric & Summary Header Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="bg-white border border-zinc-200 shadow-2xs rounded-xl p-4 flex flex-col justify-between">
          <div>
            <span className="text-xs font-medium text-zinc-500 uppercase font-mono">
              Total Outstanding Credit
            </span>
            <p className="text-2xl font-black text-zinc-900 font-mono mt-1">
              ₱{totalUnpaidAmount.toFixed(2)}
            </p>
          </div>
          <span className="text-[11px] text-zinc-400 mt-2 block">
            {unpaidDebtorCount} {unpaidDebtorCount === 1 ? "debtor with pending balance" : "debtors with pending balance"}
          </span>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-4 lg:col-span-2 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold text-zinc-900 uppercase font-mono">
                Store Credit Ledger
              </h4>
              <p className="text-xs text-zinc-500 mt-0.5">
                Track customer balances by debtor name and view itemized debt history.
              </p>
            </div>

            {/* View Mode Toggle: By Debtor (Default) vs All Transactions */}
            <div className="flex items-center gap-1 bg-zinc-100 p-0.5 rounded-lg shrink-0 self-start sm:self-auto">
              <Button
                type="button"
                size="sm"
                variant={viewMode === "debtors" ? "default" : "ghost"}
                onClick={() => setViewMode("debtors")}
                className="h-7 text-xs px-2.5 rounded-md gap-1.5 font-medium"
              >
                <User className="w-3.5 h-3.5" />
                <span>By Debtor ({debtors.length})</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant={viewMode === "transactions" ? "default" : "ghost"}
                onClick={() => setViewMode("transactions")}
                className="h-7 text-xs px-2.5 rounded-md gap-1.5 font-medium"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>All Records ({debts.length})</span>
              </Button>
            </div>
          </div>

          {/* Search bar & filter pills */}
          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-zinc-100 flex-wrap">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <Input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  viewMode === "debtors"
                    ? "Search debtor name, phone, or invoice..."
                    : "Search debtor name or invoice..."
                }
                className="pl-8 h-8 text-xs bg-zinc-50"
              />
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Button
                type="button"
                size="sm"
                variant={statusFilter === "unpaid" ? "default" : "outline"}
                onClick={() => setStatusFilter("unpaid")}
                className="h-8 text-xs px-2.5 rounded-lg"
              >
                Unpaid ({viewMode === "debtors" ? unpaidDebtorCount : debts.filter((d) => d.payment_status === "unpaid").length})
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

      {/* Main Table Card */}
      <Card className="rounded-xl border-zinc-200 shadow-sm overflow-hidden bg-white">
        {isLoading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <Loader2 className="w-6 h-6 text-zinc-400 animate-spin mb-2" />
            <span className="text-xs text-zinc-500">Loading credit ledger...</span>
          </div>
        ) : viewMode === "debtors" ? (
          /* DEBTORS TABLE VIEW (Grouped by Debtor Name) */
          filteredDebtors.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-zinc-100 text-zinc-400 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
              <h4 className="text-sm font-semibold text-zinc-900">
                {statusFilter === "unpaid" ? "No Debtors with Pending Balance" : "No debtors found"}
              </h4>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm">
                {statusFilter === "unpaid"
                  ? "All customer accounts are currently settled."
                  : "No debtor names match your search or filter criteria."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-mono text-[11px]">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Customer / Debtor</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Outstanding Balance</th>
                    <th className="py-2.5 px-4 font-semibold">Credit Activity</th>
                    <th className="py-2.5 px-4 font-semibold">Latest Transaction</th>
                    <th className="py-2.5 px-4 font-semibold text-center">Status</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredDebtors.map((debtor) => {
                    const hasUnpaid = debtor.unpaidCount > 0;
                    const dateStr = debtor.latestDebtDate
                      ? new Date(debtor.latestDebtDate).toLocaleDateString("en-PH", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—";

                    return (
                      <tr
                        key={debtor.debtorKey}
                        className="hover:bg-zinc-50/70 transition-colors cursor-pointer"
                        onClick={() => handleOpenDebtorHistory(debtor)}
                      >
                        {/* Debtor Name & Contact */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-zinc-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {debtor.name ? debtor.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                            </div>
                            <div>
                              <div className="font-semibold text-zinc-900 text-sm flex items-center gap-1.5">
                                <span>{debtor.name}</span>
                              </div>
                              {debtor.phone && (
                                <div className="flex items-center gap-1 text-[11px] text-zinc-400 font-mono mt-0.5">
                                  <Phone className="w-3 h-3" />
                                  <span>{debtor.phone}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Outstanding Balance */}
                        <td className="py-3.5 px-4 text-right">
                          <span
                            className={`font-mono font-bold text-sm block ${
                              hasUnpaid ? "text-rose-600" : "text-zinc-500"
                            }`}
                          >
                            ₱{debtor.totalUnpaidAmount.toFixed(2)}
                          </span>
                          {debtor.totalPaidAmount > 0 && (
                            <span className="text-[10px] text-zinc-400 font-mono block">
                              ₱{debtor.totalPaidAmount.toFixed(2)} settled
                            </span>
                          )}
                        </td>

                        {/* Credit Activity */}
                        <td className="py-3.5 px-4">
                          <span className="font-medium text-zinc-800 block">
                            {debtor.totalDebtsCount} {debtor.totalDebtsCount === 1 ? "credit purchase" : "credit purchases"}
                          </span>
                          <span className="text-[11px] text-zinc-400 font-mono block mt-0.5">
                            {debtor.unpaidCount} unpaid • {debtor.paidCount} settled
                          </span>
                        </td>

                        {/* Latest Transaction Date */}
                        <td className="py-3.5 px-4 font-mono text-zinc-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-zinc-400" />
                            <span>{dateStr}</span>
                          </div>
                          {debtor.debts.length > 0 && (
                            <span className="text-[10px] text-zinc-400 block mt-0.5">
                              #{debtor.debts[0].invoice_number}
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center">
                          {hasUnpaid ? (
                            <Badge
                              variant="outline"
                              className="bg-amber-50 text-amber-800 border-amber-300 text-[10px] font-mono"
                            >
                              Unpaid ({debtor.unpaidCount})
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] font-mono"
                            >
                              All Settled
                            </Badge>
                          )}
                        </td>

                        {/* Action: Open Debt History Modal */}
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenDebtorHistory(debtor)}
                              className="h-8 text-xs font-semibold gap-1.5 border-zinc-200 hover:bg-zinc-100 text-zinc-700 hover:text-zinc-900 rounded-lg shadow-2xs"
                            >
                              <History className="w-3.5 h-3.5 text-zinc-500" />
                              <span>View History</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* RAW TRANSACTIONS TABLE VIEW */
          filteredDebts.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-zinc-100 text-zinc-400 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
              <h4 className="text-sm font-semibold text-zinc-900">
                {statusFilter === "unpaid" ? "No Pending Debts" : "No records found"}
              </h4>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm">
                No credit sale records match your active search or filter criteria.
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
                      <tr key={debt.id} className="hover:bg-zinc-50/60 transition-colors">
                        {/* Customer Name */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-zinc-900 text-sm flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-zinc-400" />
                            <span>{debt.customer_name || "Anonymous Customer"}</span>
                          </div>
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
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View In Debtor Modal */}
                            {debt.customer_name && (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  const key = debt.customer_name?.trim().toLowerCase();
                                  if (key) {
                                    setSelectedDebtorKey(key);
                                    setIsHistoryModalOpen(true);
                                  }
                                }}
                                className="h-8 w-8 p-0 text-zinc-500 hover:text-zinc-900"
                                title="View Customer History"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                            )}

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
                                    <span>Settle</span>
                                  </>
                                )}
                              </Button>
                            ) : (
                              <span className="text-[11px] text-zinc-400 font-mono">Paid</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </Card>

      {/* Debtor History Modal */}
      <DebtorHistoryModal
        isOpen={isHistoryModalOpen}
        onOpenChange={setIsHistoryModalOpen}
        debtor={activeDebtor}
        onSettleDebt={onSettleDebt}
        settlingId={settlingId}
      />
    </div>
  );
}
