"use client";

import { useState, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { AppHeader } from "@/components/layout/AppHeader";
import { ReceiptScannerCard } from "@/components/station/ReceiptScannerCard";
import { BarcodeScannerCard } from "@/components/station/BarcodeScannerCard";
import { ScannedQueueTable } from "@/components/station/ScannedQueueTable";
import { QueueSummaryBar } from "@/components/station/QueueSummaryBar";
import { ProductModal } from "@/components/products/ProductModal";
import { DeleteConfirmationModal } from "@/components/common/DeleteConfirmationModal";
import { Product, ScannedItem } from "@/types/inventory";
import { useInventory } from "@/context/InventoryContext";
import { useBarcodeScanner } from "@/features/scanner/hooks/useBarcodeScanner";
import { useReceiptScanner } from "@/features/scanner/hooks/useReceiptScanner";
import { useScannedQueue } from "@/features/scanner/hooks/useScannedQueue";
import { useProductModal } from "@/features/products/hooks/useProductModal";

interface DeleteModalState {
  isOpen: boolean;
  type: "single" | "all";
  itemIndex: number | null;
  itemName: string;
}

export default function ManageStationPage() {
  const {
    products,
    categories,
    allUnits,
    setSidebarOpen,
    refreshInventory,
    showToast,
  } = useInventory();

  // Queue state
  const {
    scannedItems,
    batchImporting,
    addItems,
    updateItem,
    removeItem,
    clearQueue,
    importQueue,
  } = useScannedQueue();

  // Table search & delete modal
  const [tableSearch, setTableSearch] = useState("");
  const [editingScannedIndex, setEditingScannedIndex] = useState<number | null>(null);
  const [deleteModalState, setDeleteModalState] = useState<DeleteModalState>({
    isOpen: false,
    type: "single",
    itemIndex: null,
    itemName: "",
  });

  // Modal hook
  const productModal = useProductModal();

  // Receipt Scanner hook
  const receiptScanner = useReceiptScanner({
    onItemsScanned: addItems,
    showToast,
  });

  // Handle scanned barcode dispatch
  const handleBarcodeDetected = useCallback(
    (code: string) => {
      const trimmed = code.trim();
      if (!trimmed) return;

      // 1. Check queue
      const queueIdx = scannedItems.findIndex((item) => item.barcode === trimmed);
      if (queueIdx !== -1) {
        setEditingScannedIndex(queueIdx);
        const item = scannedItems[queueIdx];
        productModal.openEditModal({
          id: 0,
          name: item.name,
          original_name: item.original_name,
          barcode: item.barcode,
          category_id: item.category_id,
          unit: item.unit,
          cost_price: item.cost_price,
          selling_price: item.selling_price,
          stock_quantity: item.stock_quantity,
          reorder_level: item.reorder_level,
          category: null,
        });
        showToast(`Matched queue item: "${item.name}"`, "success");
        return;
      }

      // 2. Check existing store products
      const existing = products.find((p) => p.barcode === trimmed);
      if (existing) {
        setEditingScannedIndex(null);
        productModal.openEditModal(existing);
        showToast(`Scanned store SKU: "${existing.name}"`, "success");
      } else {
        // 3. New SKU - open create modal
        setEditingScannedIndex(null);
        productModal.openCreateModal(trimmed);
        showToast(`New SKU scanned [${trimmed}]. Pre-filled into queue.`, "info");
      }
    },
    [scannedItems, products, productModal, showToast]
  );

  // Barcode Scanner hook
  const barcodeScanner = useBarcodeScanner(handleBarcodeDetected);

  // Filtered queue items
  const filteredScannedItems = useMemo(() => {
    if (!tableSearch.trim()) return scannedItems;
    const q = tableSearch.toLowerCase().trim();
    return scannedItems.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.original_name && item.original_name.toLowerCase().includes(q)) ||
        (item.barcode && item.barcode.toLowerCase().includes(q)) ||
        (item.category_name && item.category_name.toLowerCase().includes(q))
    );
  }, [scannedItems, tableSearch]);

  // Open modal to edit a scanned item in queue
  const handleOpenEditScannedItem = (item: ScannedItem, index: number) => {
    setEditingScannedIndex(index);
    productModal.openEditModal({
      id: 0,
      name: item.name,
      original_name: item.original_name,
      barcode: item.barcode,
      category_id: item.category_id,
      unit: item.unit,
      cost_price: item.cost_price,
      selling_price: item.selling_price,
      stock_quantity: item.stock_quantity,
      reorder_level: item.reorder_level,
      category: null,
    });
  };

  const handleUpdateScannedItemField = (
    index: number,
    field: keyof ScannedItem,
    val: string | number
  ) => {
    const target = scannedItems[index];
    if (!target) return;
    const updated = { ...target, [field]: val };
    updateItem(index, updated);
  };

  // Modal submission handler: routes between staging queue and database
  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingScannedIndex !== null) {
      // Update item in staging queue
      const updated: ScannedItem = {
        name: productModal.formData.name.trim(),
        original_name: productModal.formData.original_name?.trim() || productModal.formData.name.trim(),
        barcode: productModal.formData.barcode?.trim() || null,
        category_id: productModal.formData.category_id ? parseInt(productModal.formData.category_id, 10) : null,
        category_name:
          categories.find((c) => c.id === parseInt(productModal.formData.category_id, 10))?.name || "Uncategorized",
        unit: productModal.formData.unit || "pc",
        cost_price: productModal.formData.cost_price,
        selling_price: productModal.formData.selling_price,
        stock_quantity: parseInt(productModal.formData.stock_quantity, 10) || 1,
        reorder_level: parseInt(productModal.formData.reorder_level, 10) || 5,
      };
      updateItem(editingScannedIndex, updated);
      productModal.closeModal();
      showToast(`Updated queue item: "${updated.name}"`, "success");
    } else if (productModal.editingProductId !== null) {
      // Update existing database product
      await productModal.handleSaveProduct(async (updatedProduct: Product) => {
        await refreshInventory();
        showToast(`Product "${updatedProduct.name}" updated successfully!`, "success");
      });
    } else {
      // Add new item to staging queue
      const newItem: ScannedItem = {
        name: productModal.formData.name.trim(),
        original_name: productModal.formData.original_name?.trim() || productModal.formData.name.trim(),
        barcode: productModal.formData.barcode?.trim() || null,
        category_id: productModal.formData.category_id ? parseInt(productModal.formData.category_id, 10) : null,
        category_name:
          categories.find((c) => c.id === parseInt(productModal.formData.category_id, 10))?.name || "Uncategorized",
        unit: productModal.formData.unit || "pc",
        cost_price: productModal.formData.cost_price,
        selling_price: productModal.formData.selling_price,
        stock_quantity: parseInt(productModal.formData.stock_quantity, 10) || 1,
        reorder_level: parseInt(productModal.formData.reorder_level, 10) || 5,
      };
      addItems([newItem]);
      productModal.closeModal();
      showToast(`Added "${newItem.name}" to staging queue.`, "success");
    }
  };

  // Batch import staging queue to database
  const handleBatchImport = async () => {
    try {
      const count = await importQueue();
      receiptScanner.onClearPreview();
      await refreshInventory();
      showToast(`Batch imported ${count} products to ledger!`, "success");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Batch import failed.";
      showToast(message, "error");
    }
  };

  const handleConfirmDelete = () => {
    if (deleteModalState.type === "all") {
      clearQueue();
      showToast("Staging queue cleared.", "info");
    } else if (deleteModalState.itemIndex !== null) {
      removeItem(deleteModalState.itemIndex);
      showToast("Item removed from queue.", "info");
    }
    setDeleteModalState((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <>
      <AppHeader
        title="Scan & Restock Station"
        subtitle="Extract line items from paper receipts with Gemini OCR or scan physical barcodes"
        onOpenSidebar={() => setSidebarOpen(true)}
      />

      <main className="p-4 sm:p-8 flex-1 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Scanned Items Queue Table */}
          <Card className="lg:col-span-7 flex flex-col h-[calc(100vh-8.5rem)] overflow-hidden shadow-2xs border-zinc-200">
            <ScannedQueueTable
              scannedItems={scannedItems}
              filteredScannedItems={filteredScannedItems}
              tableSearch={tableSearch}
              setTableSearch={setTableSearch}
              batchImporting={batchImporting}
              onClearQueue={() =>
                setDeleteModalState({
                  isOpen: true,
                  type: "all",
                  itemIndex: null,
                  itemName: "all items",
                })
              }
              onBatchImport={handleBatchImport}
              onUpdateItemField={handleUpdateScannedItemField}
              onOpenItemModal={handleOpenEditScannedItem}
              onDeleteItem={(idx) =>
                setDeleteModalState({
                  isOpen: true,
                  type: "single",
                  itemIndex: idx,
                  itemName: scannedItems[idx]?.name || "item",
                })
              }
            />

            <QueueSummaryBar scannedItems={scannedItems} />
          </Card>

          {/* Right: Scanners */}
          <div className="lg:col-span-5 space-y-5">
            <ReceiptScannerCard
              fileInputRef={receiptScanner.fileInputRef}
              onFileChange={receiptScanner.onFileChange}
              scanning={receiptScanner.scanning}
              selectedReceiptPreview={receiptScanner.selectedReceiptPreview}
              onClearPreview={receiptScanner.onClearPreview}
              scannedCount={scannedItems.length}
              scanQuota={receiptScanner.scanQuota}
            />

            <BarcodeScannerCard {...barcodeScanner} />
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
        isOpen={deleteModalState.isOpen}
        onOpenChange={(open) => setDeleteModalState((prev) => ({ ...prev, isOpen: open }))}
        onConfirm={handleConfirmDelete}
        title={deleteModalState.type === "all" ? "Clear Entire Scan Queue" : "Remove Item from Queue"}
        itemName={deleteModalState.itemName}
        confirmText={deleteModalState.type === "all" ? "Clear All" : "Remove Item"}
        description={
          deleteModalState.type === "all"
            ? "Are you sure you want to remove all staged items from the receipt queue? Any unsaved edits will be discarded."
            : undefined
        }
      />
    </>
  );
}
