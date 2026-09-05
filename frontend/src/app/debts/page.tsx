"use client";

import { useState, useEffect, useCallback } from "react";
import { BookUser, Plus, RefreshCw, User, Phone, Check, Search, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AppHeader } from "@/components/layout/AppHeader";
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

  // Quick New Debt Entry Form
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState("");
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
      await settleDebt(sale.id, "Bayad sa tindahan");
      await loadDebts();
      showToast(`Utang ni ${sale.customer_name} has been settled!`, "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to settle debt";
      showToast(msg, "error");
    } finally {
      setSettlingId(null);
    }
  };

  // Quick 10-second Add Utang Handler
  const handleQuickAddDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !selectedProductId || quantity <= 0) {
      showToast("Please fill in customer name and choose a product.", "warning");
      return;
    }

    setSavingDebt(true);
    try {
      const sale = await checkoutPos({
        payment_type: "credit",
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim() || undefined,
        notes: notes.trim() || undefined,
        items: [{ product_id: selectedProductId, quantity }],
      });

      // Reset form
      setCustomerName("");
      setCustomerPhone("");
      setSelectedProductId(null);
      setQuantity(1);
      setNotes("");

      await Promise.all([loadDebts(), refreshInventory()]);
      showToast(`Utang ni ${sale.customer_name} recorded (₱${sale.total_amount.toFixed(2)})!`, "success");
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
        title="Listahan ng Utang (Store Credit Ledger)"
        subtitle="Record quick customer credit, track unpaid balances, and record payments"
        onOpenSidebar={() => setSidebarOpen(true)}
      />

      <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto w-full flex-1">
        {/* Quick Add Debt Card */}
        <Card className="rounded-xl border-zinc-200 bg-white shadow-2xs">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center">
                <BookUser className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-zinc-900">
                  Quick Log Utang (New Customer Credit)
                </CardTitle>
                <CardDescription className="text-xs text-zinc-500">
                  Quickly add items taken on store credit in 10 seconds
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 pt-1">
            <form onSubmit={handleQuickAddDebt} className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
              {/* Customer Name */}
              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold text-zinc-700 block mb-1">
                  Customer Name *
                </label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Aling Nena, Kuya Jun"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="h-9 text-xs bg-white"
                />
              </div>

              {/* Product Select */}
              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold text-zinc-700 block mb-1">
                  Item Taken *
                </label>
                <select
                  required
                  value={selectedProductId || ""}
                  onChange={(e) => setSelectedProductId(parseInt(e.target.value) || null)}
                  className="w-full h-9 px-3 rounded-lg text-xs bg-white border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select product...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (₱{parseFloat(p.selling_price).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="text-[11px] font-semibold text-zinc-700 block mb-1">
                  Quantity
                </label>
                <Input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="h-9 text-xs font-mono font-bold bg-white"
                />
              </div>

              {/* Notes (Optional) */}
              <div className="sm:col-span-4">
                <Input
                  type="text"
                  placeholder="Optional promissory note (e.g. Bayaran sa Friday sa sweldo)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-8 text-xs bg-white"
                />
              </div>

              {/* Submit Button */}
              <div className="sm:col-span-1">
                <Button
                  type="submit"
                  disabled={savingDebt || !customerName.trim() || !selectedProductId}
                  className="w-full h-8 text-xs bg-zinc-900 hover:bg-zinc-800 text-white font-semibold rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>{savingDebt ? "Saving..." : "I-lista"}</span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

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
