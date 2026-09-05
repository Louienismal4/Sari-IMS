"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Store, ShoppingCart, BookUser, History, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/layout/AppHeader";
import { PosProductGrid } from "@/components/pos/PosProductGrid";
import { PosCartDrawer } from "@/components/pos/PosCartDrawer";
import { CashCheckoutModal } from "@/components/pos/CashCheckoutModal";
import { OwedCustomerModal } from "@/components/pos/OwedCustomerModal";
import { DebtsLedgerView } from "@/components/pos/DebtsLedgerView";
import { useInventory } from "@/context/InventoryContext";
import { usePosCart } from "@/features/pos/hooks/usePosCart";
import {
  checkoutPos,
  fetchDebts,
  settleDebt,
} from "@/features/pos/api/posService";
import { Sale } from "@/types/inventory";

export default function PosPage() {
  const {
    products,
    categories,
    setSidebarOpen,
    refreshInventory,
    showToast,
  } = useInventory();

  // Active view tab: "counter" (POS sale register) vs "debts" (Listahan ng Utang)
  const [activeTab, setActiveTab] = useState<"counter" | "debts">("counter");

  // Cart Management Hook
  const {
    cartItems,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    totalAmount,
    totalItemCount,
  } = usePosCart({ showToast });

  // Modals state
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [isUtangModalOpen, setIsUtangModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Debts ledger state
  const [debts, setDebts] = useState<Sale[]>([]);
  const [loadingDebts, setLoadingDebts] = useState(false);
  const [settlingId, setSettlingId] = useState<number | null>(null);

  // Load debts list
  const loadDebts = useCallback(async () => {
    setLoadingDebts(true);
    try {
      const data = await fetchDebts({ status: "all" });
      setDebts(data);
    } catch (err: unknown) {
      console.error("Failed to load debts:", err);
    } finally {
      setLoadingDebts(false);
    }
  }, []);

  useEffect(() => {
    loadDebts();
  }, [loadDebts]);

  // Existing debtor names for suggestions
  const existingDebtorNames = useMemo(() => {
    const names = debts
      .map((d) => d.customer_name)
      .filter((n): n is string => Boolean(n && n.trim()));
    return Array.from(new Set(names));
  }, [debts]);

  // Item counts in cart map
  const cartProductCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    cartItems.forEach((item) => {
      counts[item.product.id] = item.quantity;
    });
    return counts;
  }, [cartItems]);

  // Cash sale confirmation
  const handleConfirmCashSale = async (amountTendered: number) => {
    if (cartItems.length === 0) return;
    setIsProcessing(true);

    try {
      const sale = await checkoutPos({
        payment_type: "cash",
        amount_tendered: amountTendered,
        items: cartItems.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
        })),
      });

      clearCart();
      setIsCashModalOpen(false);
      await refreshInventory();
      await loadDebts();

      showToast(
        `Cash Sale Complete! Change: ₱${sale.change_amount.toFixed(2)} (#${sale.invoice_number})`,
        "success"
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to complete cash checkout";
      showToast(msg, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Owed / Utang sale confirmation
  const handleConfirmUtangSale = async (customerData: {
    customer_name: string;
    customer_phone?: string;
    notes?: string;
  }) => {
    if (cartItems.length === 0) return;
    setIsProcessing(true);

    try {
      const sale = await checkoutPos({
        payment_type: "credit",
        customer_name: customerData.customer_name,
        customer_phone: customerData.customer_phone,
        notes: customerData.notes,
        items: cartItems.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
        })),
      });

      clearCart();
      setIsUtangModalOpen(false);
      await refreshInventory();
      await loadDebts();

      showToast(
        `Store credit recorded for ${sale.customer_name} (₱${sale.total_amount.toFixed(2)})`,
        "success"
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to record credit sale";
      showToast(msg, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Settle debt action
  const handleSettleDebt = async (sale: Sale) => {
    setSettlingId(sale.id);
    try {
      await settleDebt(sale.id, "Settled at counter");
      await loadDebts();
      showToast(`Credit account for ${sale.customer_name} has been settled!`, "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to settle debt";
      showToast(msg, "error");
    } finally {
      setSettlingId(null);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
      {/* Top Navbar */}
      <AppHeader
        title="POS Counter & Register"
        subtitle="Process counter sales and log customer store credit"
        onOpenSidebar={() => setSidebarOpen(true)}
      />

      {/* Sub-Header Mode Switcher */}
      <div className="px-4 sm:px-6 py-2 bg-white border-b border-zinc-200 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant={activeTab === "counter" ? "default" : "ghost"}
            onClick={() => setActiveTab("counter")}
            className="text-xs h-8 gap-1.5 rounded-lg"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Sales Counter</span>
            {totalItemCount > 0 && (
              <span className="ml-1 bg-blue-500 text-white rounded-full px-1.5 py-0 text-[10px] font-mono">
                {totalItemCount}
              </span>
            )}
          </Button>

          <Button
            type="button"
            size="sm"
            variant={activeTab === "debts" ? "default" : "ghost"}
            onClick={() => setActiveTab("debts")}
            className="text-xs h-8 gap-1.5 rounded-lg"
          >
            <BookUser className="w-3.5 h-3.5" />
            <span>Customer Debts</span>
            {debts.filter((d) => d.payment_status === "unpaid").length > 0 && (
              <span className="ml-1 bg-amber-500 text-white rounded-full px-1.5 py-0 text-[10px] font-mono font-bold">
                {debts.filter((d) => d.payment_status === "unpaid").length}
              </span>
            )}
          </Button>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={async () => {
            await Promise.all([refreshInventory(), loadDebts()]);
            showToast("POS inventory and debts refreshed", "info");
          }}
          className="text-xs h-8 gap-1 text-zinc-500"
        >
          <RefreshCw className="w-3 h-3" />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden p-3 sm:p-5">
        {activeTab === "counter" ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-full">
            {/* Catalog & Search: 7 cols on desktop */}
            <div className="md:col-span-7 lg:col-span-8 h-full overflow-hidden flex flex-col">
              <PosProductGrid
                products={products}
                categories={categories}
                onAddToCart={addToCart}
                cartProductCounts={cartProductCounts}
              />
            </div>

            {/* Counter Ticket / Cart: 5 cols on desktop */}
            <div className="md:col-span-5 lg:col-span-4 h-full overflow-hidden flex flex-col">
              <PosCartDrawer
                cartItems={cartItems}
                totalAmount={totalAmount}
                totalItemCount={totalItemCount}
                onUpdateQuantity={updateQuantity}
                onRemoveItem={removeFromCart}
                onClearCart={clearCart}
                onOpenCashModal={() => setIsCashModalOpen(true)}
                onOpenUtangModal={() => setIsUtangModalOpen(true)}
              />
            </div>
          </div>
        ) : (
          <div className="h-full overflow-y-auto pr-1">
            <DebtsLedgerView
              debts={debts}
              isLoading={loadingDebts}
              onSettleDebt={handleSettleDebt}
              settlingId={settlingId}
            />
          </div>
        )}
      </div>

      {/* Checkout Modals */}
      <CashCheckoutModal
        isOpen={isCashModalOpen}
        onOpenChange={setIsCashModalOpen}
        totalAmount={totalAmount}
        onConfirm={handleConfirmCashSale}
        isProcessing={isProcessing}
      />

      <OwedCustomerModal
        isOpen={isUtangModalOpen}
        onOpenChange={setIsUtangModalOpen}
        totalAmount={totalAmount}
        onConfirm={handleConfirmUtangSale}
        isProcessing={isProcessing}
        existingDebtorNames={existingDebtorNames}
      />
    </div>
  );
}
