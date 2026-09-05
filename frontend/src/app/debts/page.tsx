"use client";

import { useState, useEffect, useCallback } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { QuickLogDebtCard } from "@/components/pos/QuickLogDebtCard";
import { DebtsLedgerView } from "@/components/pos/DebtsLedgerView";
import { useInventory } from "@/context/InventoryContext";
import { fetchDebts, settleDebt, checkoutPos } from "@/features/pos/api/posService";
import { Sale } from "@/types/inventory";

export default function DebtsPage() {
  const { products, setSidebarOpen, refreshInventory, showToast } = useInventory();

  // Debts list state
  const [debts, setDebts] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [settlingId, setSettlingId] = useState<number | null>(null);
  const [savingDebt, setSavingDebt] = useState(false);

  // Load debts list
  const loadDebts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDebts({ status: "all" });
      setDebts(data);
    } catch (err: unknown) {
      console.error("Failed to load debts:", err);
      showToast("Failed to load debts", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadDebts();
  }, [loadDebts]);

  // Handle Settle Debt
  const handleSettleDebt = async (sale: Sale) => {
    setSettlingId(sale.id);
    try {
      await settleDebt(sale.id, "Settled in store");
      await loadDebts();
      showToast(`Credit account for ${sale.customer_name} has been settled!`, "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to settle debt";
      showToast(msg, "error");
    } finally {
      setSettlingId(null);
    }
  };

  // Multi-Item Add Customer Debt Handler
  const handleSaveDebt = async (payload: {
    customer_name: string;
    items: { product_id: number; quantity: number }[];
  }) => {
    setSavingDebt(true);
    try {
      const sale = await checkoutPos({
        payment_type: "credit",
        customer_name: payload.customer_name,
        items: payload.items,
      });

      await Promise.all([loadDebts(), refreshInventory()]);
      const totalPieces = payload.items.reduce((sum, it) => sum + it.quantity, 0);
      showToast(
        `Debt for ${sale.customer_name} recorded (₱${sale.total_amount.toFixed(2)}, ${payload.items.length} ${payload.items.length === 1 ? "item" : "items"}, ${totalPieces} pcs)!`,
        "success"
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to record debt";
      showToast(msg, "error");
    } finally {
      setSavingDebt(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <AppHeader
        title="Customer Credit Ledger"
        subtitle="Record customer store credit, track unpaid balances, and manage settlements"
        onOpenSidebar={() => setSidebarOpen(true)}
      />

      <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto w-full flex-1">
        {/* Quick Multi-Item Add Debt Card */}
        <QuickLogDebtCard
          products={products}
          onSaveDebt={handleSaveDebt}
          isSaving={savingDebt}
        />

        {/* Debts Ledger View */}
        <DebtsLedgerView
          debts={debts}
          isLoading={loading}
          onSettleDebt={handleSettleDebt}
          settlingId={settlingId}
        />
      </div>
    </div>
  );
}
