"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { Sparkles, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AppHeader } from "@/components/layout/AppHeader";
import { ValuationKPIs } from "@/components/dashboard/ValuationKPIs";
import { CategoryBreakdown } from "@/components/dashboard/CategoryBreakdown";
import { RestockUrgencyFeed } from "@/components/dashboard/RestockUrgencyFeed";
import { TopMarginLeaders } from "@/components/dashboard/TopMarginLeaders";
import { ActivityLedger } from "@/components/dashboard/ActivityLedger";
import { ProductTable } from "@/components/products/ProductTable";
import { ProductModal } from "@/components/products/ProductModal";
import { DeleteConfirmationModal } from "@/components/common/DeleteConfirmationModal";
import { Product, StockMovement, SortField, SortOrder } from "@/types/inventory";
import { fetchStockMovements } from "@/features/stock-movements/api/stockMovementService";
import { useInventory } from "@/context/InventoryContext";
import { useProductModal } from "@/features/products/hooks/useProductModal";
import { useStockAdjustments } from "@/features/stock-movements/hooks/useStockAdjustments";

export default function DashboardPage() {
  const {
    products,
    categories,
    allUnits,
    totalSKUs,
    totalUnits,
    totalCapital,
    totalRevenue,
    totalTubo,
    overallMargin,
    lowStockCount,
    setSidebarOpen,
    refreshInventory,
    isLoading,
    showToast,
  } = useInventory();

  const [recentMovements, setRecentMovements] = useState<StockMovement[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | "all">("all");
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>("");

  // Sort State
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Product modal hook
  const productModal = useProductModal();

  // Refresh movements helper
  const reloadMovements = useCallback(async () => {
    try {
      const movements = await fetchStockMovements(8);
      setRecentMovements(movements);
    } catch {}
  }, []);

  // Stock adjustments and delete hook
  const stockAdjustments = useStockAdjustments({
    onRefresh: async () => {
      await refreshInventory();
      await reloadMovements();
    },
    showToast,
  });

  // Live clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString("en-PH", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Load initial recent movements
  useEffect(() => {
    let ignore = false;
    fetchStockMovements(8)
      .then((movements) => {
        if (!ignore) setRecentMovements(movements);
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await productModal.handleSaveProduct(async (savedProduct: Product) => {
      await refreshInventory();
      showToast(`Product "${savedProduct.name}" updated successfully!`, "success");
    });
  };

  const displayedProducts = useMemo(() => {
    const filtered = products.filter((p) => {
      if (activeCategory === "all") return true;
      return p.category?.id === activeCategory || p.category_id === activeCategory;
    });

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortField === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === "stock_quantity") {
        comparison = a.stock_quantity - b.stock_quantity;
      } else if (sortField === "cost_price") {
        comparison = parseFloat(a.cost_price) - parseFloat(b.cost_price);
      } else if (sortField === "selling_price") {
        comparison = parseFloat(a.selling_price) - parseFloat(b.selling_price);
      } else if (sortField === "margin") {
        const aCost = parseFloat(a.cost_price) || 1;
        const aRetail = parseFloat(a.selling_price) || 0;
        const aMargin = (aRetail - aCost) / aCost;

        const bCost = parseFloat(b.cost_price) || 1;
        const bRetail = parseFloat(b.selling_price) || 0;
        const bMargin = (bRetail - bCost) / bCost;

        comparison = aMargin - bMargin;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [products, activeCategory, sortField, sortOrder]);

  const lowStockItems = useMemo(
    () => products.filter((p) => p.stock_quantity <= p.reorder_level),
    [products]
  );

  const topMarginProducts = useMemo(() => {
    return [...products]
      .map((p) => {
        const cost = parseFloat(p.cost_price) || 0;
        const retail = parseFloat(p.selling_price) || 0;
        const tubo = retail - cost;
        const marginPct = cost > 0 ? (tubo / cost) * 100 : 0;
        return { ...p, tubo, marginPct };
      })
      .filter((p) => p.cost_price && p.selling_price && p.stock_quantity > 0)
      .sort((a, b) => b.marginPct - a.marginPct)
      .slice(0, 4);
  }, [products]);

  return (
    <>
      <AppHeader
        title="Tindahan Dashboard"
        subtitle="Live inventory valuation, quick stock logger, profit metrics & restock alerts"
        currentTime={currentTime}
        onOpenSidebar={() => setSidebarOpen(true)}
        actions={
          <Link href="/manage">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs bg-zinc-50">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Receipt &amp; Barcode</span> Station
            </Button>
          </Link>
        }
      />

      {error && (
        <Card className="mx-4 sm:mx-8 mt-4 border-rose-200 bg-rose-50">
          <CardContent className="p-4 flex items-center justify-between text-xs text-rose-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setError(null)}
              className="h-6 w-6 text-rose-500 hover:text-rose-800"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </CardContent>
        </Card>
      )}

      <main className="p-4 sm:p-8 space-y-6 flex-1">
        <ValuationKPIs
          totalCapital={totalCapital}
          totalRevenue={totalRevenue}
          totalTubo={totalTubo}
          overallMargin={overallMargin}
          totalProductsCount={totalSKUs}
          totalPhysicalUnits={totalUnits}
          lowStockCount={lowStockCount}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 space-y-6">
            <Card className="shadow-2xs border-zinc-200">
              <div className="p-4 border-b border-zinc-200 bg-zinc-50/70">
                <h3 className="text-sm font-bold text-zinc-900">
                  Store Inventory &amp; Quick Sale Logger
                </h3>
                <p className="text-[11px] text-zinc-500">
                  Click + / - to log rapid stock adjustments; use action menu to edit details or delete SKUs.
                </p>
              </div>
              <ProductTable
                products={displayedProducts}
                loading={isLoading}
                onSort={handleSort}
                onEdit={productModal.openEditModal}
                onDelete={stockAdjustments.promptDeleteProduct}
                onStockAdjust={stockAdjustments.handleQuickStockChange}
                updatingStockId={stockAdjustments.updatingStockId}
              />
            </Card>

            <CategoryBreakdown
              categories={categories}
              products={products}
              activeCategory={activeCategory}
              onSelectCategory={setActiveCategory}
            />
          </div>

          <div className="lg:col-span-4 space-y-6">
            <RestockUrgencyFeed
              lowStockItems={lowStockItems}
              onRestock={(item, qty) => stockAdjustments.handleQuickStockChange(item, qty)}
            />

            <TopMarginLeaders topMarginProducts={topMarginProducts} />

            <ActivityLedger recentMovements={recentMovements} />
          </div>
        </div>
      </main>

      <ProductModal
        isOpen={productModal.isOpen}
        onOpenChange={productModal.setIsOpen}
        modalMode={productModal.modalMode}
        formData={productModal.formData}
        setFormData={productModal.setFormData}
        categories={categories}
        units={allUnits}
        onSubmit={handleModalSubmit}
        loading={productModal.loading}
        formError={productModal.formError}
        onConvertPackToPieces={productModal.handleConvertPackToPieces}
      />

      <DeleteConfirmationModal
        isOpen={stockAdjustments.isDeleteModalOpen}
        onOpenChange={stockAdjustments.setIsDeleteModalOpen}
        onConfirm={stockAdjustments.confirmDeleteProduct}
        title="Delete Product SKU"
        itemName={stockAdjustments.productToDelete?.name}
        confirmText="Delete SKU"
        loading={stockAdjustments.deleteLoading}
      />
    </>
  );
}
