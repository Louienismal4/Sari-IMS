"use client";

import { useState } from "react";
import { Download, FileJson, FileSpreadsheet, Trash2, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DeleteConfirmationModal } from "@/components/common/DeleteConfirmationModal";
import { PurgeDatabaseModal } from "@/components/settings/PurgeDatabaseModal";
import { Product } from "@/types/inventory";

interface DataManagementCardProps {
  products: Product[];
  onRefreshInventory: () => Promise<void>;
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
}

export function DataManagementCard({
  products,
  onRefreshInventory,
  showToast,
}: DataManagementCardProps) {
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);

  // Export JSON
  const handleExportJSON = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(products, null, 2));
      const downloadAnchor = document.createElement("a");
      const timestamp = new Date().toISOString().slice(0, 10);
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `sari_inventory_backup_${timestamp}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast(`Exported ${products.length} products to JSON backup!`, "success");
    } catch {
      showToast("Failed to export inventory JSON.", "error");
    }
  };

  // Helper to sanitize CSV cells against formula injection (CWE-1236)
  const sanitizeForCsv = (val: unknown): string => {
    if (val === null || val === undefined) return '""';
    let str = String(val);
    // Neutralize formula triggers (=, +, -, @, tab, CR) by prefixing with a single quote
    if (/^[=+\-@\t\r]/.test(str)) {
      str = "'" + str;
    }
    return `"${str.replace(/"/g, '""')}"`;
  };

  // Export CSV
  const handleExportCSV = () => {
    try {
      const headers = ["ID", "Name", "Original Receipt Name", "Barcode SKU", "Category", "Unit", "Cost Price (PHP)", "Selling Price (PHP)", "Stock Quantity", "Reorder Level"];
      const rows = products.map((p) => [
        sanitizeForCsv(p.id),
        sanitizeForCsv(p.name),
        sanitizeForCsv(p.original_name || p.name),
        sanitizeForCsv(p.barcode || ""),
        sanitizeForCsv(p.category?.name || "Uncategorized"),
        sanitizeForCsv(p.unit),
        sanitizeForCsv(p.cost_price),
        sanitizeForCsv(p.selling_price),
        sanitizeForCsv(p.stock_quantity),
        sanitizeForCsv(p.reorder_level),
      ]);

      const csvString = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement("a");
      const timestamp = new Date().toISOString().slice(0, 10);
      downloadAnchor.setAttribute("href", url);
      downloadAnchor.setAttribute("download", `sari_inventory_${timestamp}.csv`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      URL.revokeObjectURL(url);
      showToast(`Exported ${products.length} products to CSV spreadsheet!`, "success");
    } catch {
      showToast("Failed to export inventory CSV.", "error");
    }
  };

  // Clear Staging Queue
  const handleConfirmResetQueue = () => {
    localStorage.removeItem("sari_scanned_receipt_queue");
    sessionStorage.removeItem("sari_receipt_preview");
    showToast("Cleared browser staging queue cache.", "info");
    setIsResetModalOpen(false);
  };

  // Purge Success Handler
  const handlePurgeSuccess = async (message: string) => {
    await onRefreshInventory();
    showToast(message, "success");
  };

  return (
    <>
      <Card className="shadow-2xs border-zinc-200">
        <CardHeader className="p-4 sm:p-5 pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-zinc-900">
                Backup &amp; Data Management
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500">
                Export your store catalog records, create offline backups, or purge database tables
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Export JSON */}
            <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 flex flex-col justify-between space-y-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-semibold text-xs text-zinc-900">
                  <FileJson className="w-4 h-4 text-amber-600" />
                  <span>JSON Database Backup</span>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Download a complete raw JSON file of all {products.length} registered products and metadata.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportJSON}
                disabled={products.length === 0}
                className="w-full text-xs gap-1.5 bg-white min-h-[36px]"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON</span>
              </Button>
            </div>

            {/* Export CSV */}
            <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 flex flex-col justify-between space-y-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-semibold text-xs text-zinc-900">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Excel / CSV Spreadsheet</span>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Export product names, barcodes, costs, selling prices, and stock numbers for Excel or Sheets.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                disabled={products.length === 0}
                className="w-full text-xs gap-1.5 bg-white min-h-[36px]"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </Button>
            </div>
          </div>

          {/* Reset Queue Helper */}
          <div className="pt-2 border-t border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-zinc-50/80 rounded-xl border border-zinc-200">
            <div>
              <span className="text-xs font-semibold text-zinc-800 block">
                Reset Browser Staging Queue
              </span>
              <span className="text-[11px] text-zinc-500 block">
                Clear temporarily cached scanned receipts and unimported queue items from this browser
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsResetModalOpen(true)}
              className="text-xs border-zinc-300 text-zinc-700 hover:bg-zinc-100 shrink-0 gap-1.5 min-h-[36px]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset Staging Queue</span>
            </Button>
          </div>

          {/* Danger Zone: Purge & Reset Database */}
          <div className="pt-2 border-t border-rose-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-rose-50/70 rounded-xl border border-rose-200">
            <div>
              <div className="flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="text-xs font-bold text-rose-900">
                  Danger Zone: Purge Database
                </span>
              </div>
              <span className="text-[11px] text-rose-700 block pt-0.5">
                Permanently erase all product inventory, transaction logs, and barcodes. Requires typed challenge confirmation.
              </span>
            </div>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setIsPurgeModalOpen(true)}
              className="text-xs shrink-0 gap-1.5 min-h-[36px] font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Purge Database</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal for Staging Reset */}
      <DeleteConfirmationModal
        isOpen={isResetModalOpen}
        onOpenChange={setIsResetModalOpen}
        onConfirm={handleConfirmResetQueue}
        title="Reset Staging Queue"
        confirmText="Clear Staging Cache"
        description="Are you sure you want to clear all unimported receipt items from your browser storage? This will not affect products already saved to your store database."
      />

      {/* Purge Database Security Modal */}
      <PurgeDatabaseModal
        isOpen={isPurgeModalOpen}
        onOpenChange={setIsPurgeModalOpen}
        onSuccess={handlePurgeSuccess}
      />
    </>
  );
}
