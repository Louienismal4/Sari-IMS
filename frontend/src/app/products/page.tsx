"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Sparkles, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AppHeader } from "@/components/layout/AppHeader";
import { ProductFilters } from "@/components/products/ProductFilters";
import { ProductTable } from "@/components/products/ProductTable";
import { ProductModal } from "@/components/products/ProductModal";
import { DeleteConfirmationModal } from "@/components/common/DeleteConfirmationModal";
import { CatalogSummaryBar } from "@/components/products/CatalogSummaryBar";
import { Product } from "@/types/inventory";
import { useInventory } from "@/context/InventoryContext";
import { useProductFilters } from "@/features/products/hooks/useProductFilters";
import { useProductModal } from "@/features/products/hooks/useProductModal";
import { useStockAdjustments } from "@/features/stock-movements/hooks/useStockAdjustments";

export default function ProductsListPage() {
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
    setSidebarOpen,
    refreshInventory,
    isLoading,
    showToast,
  } = useInventory();

  const [error, setError] = useState<string | null>(null);

  // Filter, sort & search hook
  const {
    stockFilter,
    setStockFilter,
    handleSort,
    search,
    setSearch,
    searchInputRef,
    filteredProducts,
  } = useProductFilters(products);

  // Modal form hook
  const productModal = useProductModal();

  // Stock adjustments and delete hook
  const stockAdjustments = useStockAdjustments({
    onRefresh: refreshInventory,
    showToast,
  });

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await productModal.handleSaveProduct(async (savedProduct: Product) => {
      await refreshInventory();
      showToast(
        productModal.modalMode === "create"
          ? `Product "${savedProduct.name}" created successfully!`
          : `Product "${savedProduct.name}" updated successfully!`,
        "success"
      );
    });
  };

  return (
    <>
      <AppHeader
        title="Products Catalog"
        subtitle="Master database catalog of all products, stock counts, profit margins & prices"
        onOpenSidebar={() => setSidebarOpen(true)}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/manage">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs bg-zinc-50 hidden sm:inline-flex"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Scan Receipt</span>
              </Button>
            </Link>
            <Button
              onClick={() => productModal.openCreateModal()}
              size="sm"
              className="gap-1.5 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Product</span>
            </Button>
          </div>
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

      <main className="p-4 sm:p-8 flex-1">
        <Card className="flex flex-col h-[calc(100vh-8.5rem)] overflow-hidden shadow-2xs border-zinc-200">
          <CardHeader className="p-4 border-b border-zinc-200 space-y-3 bg-zinc-50/80 shrink-0">
            <ProductFilters
              search={search}
              setSearch={setSearch}
              searchInputRef={searchInputRef}
              stockFilter={stockFilter}
              setStockFilter={setStockFilter}
              products={products}
            />
          </CardHeader>

          <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-zinc-100">
            <ProductTable
              products={filteredProducts}
              loading={isLoading}
              onSort={handleSort}
              onEdit={productModal.openEditModal}
              onDelete={stockAdjustments.promptDeleteProduct}
              onStockAdjust={stockAdjustments.handleQuickStockChange}
              updatingStockId={stockAdjustments.updatingStockId}
              searchQuery={search}
              onResetFilters={() => {
                setSearch("");
                setStockFilter("all");
              }}
            />
          </div>

          <CatalogSummaryBar
            totalSKUs={totalSKUs}
            totalUnits={totalUnits}
            totalCapital={totalCapital}
            totalRevenue={totalRevenue}
            totalTubo={totalTubo}
            overallMargin={overallMargin}
          />
        </Card>
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
