"use client";

import { useState, useRef, useId } from "react";
import {
  UploadCloud,
  FileJson,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Package,
  ShoppingCart,
  Calendar,
  RefreshCw,
  Clock,
  Store,
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
import {
  restoreInstanceBackupApi,
  RestoreBackupResult,
} from "@/features/settings/api/databaseAdminService";
import { StoreSettings } from "@/types/inventory";

interface RestoreBackupModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateSettings?: (settings: StoreSettings) => void;
  onRefreshInventory: () => Promise<void>;
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
}

interface BackupPreview {
  isFullInstance: boolean;
  storeName?: string;
  ownerName?: string;
  exportedAt?: string;
  categoriesCount: number;
  productsCount: number;
  salesCount: number;
  auditsCount: number;
}

export function RestoreBackupModal({
  isOpen,
  onOpenChange,
  onUpdateSettings,
  onRefreshInventory,
  showToast,
}: RestoreBackupModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [rawBackup, setRawBackup] = useState<unknown | null>(null);
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [mode, setMode] = useState<"full" | "merge">("full");
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const confirmCheckboxId = useId();

  const handleFileChange = async (selectedFile: File) => {
    setError(null);
    setFile(selectedFile);

    try {
      const text = await selectedFile.text();
      const parsed = JSON.parse(text);
      setRawBackup(parsed);

      if (Array.isArray(parsed)) {
        // Legacy product array backup
        const catSet = new Set<string>();
        parsed.forEach((p) => {
          const cName = p?.category?.name || p?.category_name;
          if (cName) catSet.add(String(cName));
        });

        setPreview({
          isFullInstance: false,
          categoriesCount: catSet.size,
          productsCount: parsed.length,
          salesCount: 0,
          auditsCount: 0,
        });
      } else if (parsed && typeof parsed === "object") {
        const pObj = parsed as Record<string, unknown>;
        const categories = Array.isArray(pObj.categories) ? pObj.categories : [];
        const products = Array.isArray(pObj.products) ? pObj.products : [];
        const sales = Array.isArray(pObj.sales) ? pObj.sales : [];
        const audits = Array.isArray(pObj.stock_audits) ? pObj.stock_audits : [];
        const settings = pObj.store_settings as Record<string, string> | undefined;

        setPreview({
          isFullInstance: pObj.format === "sari_full_instance_backup",
          storeName: settings?.store_name,
          ownerName: settings?.owner_name,
          exportedAt: typeof pObj.exported_at === "string" ? pObj.exported_at : undefined,
          categoriesCount: categories.length,
          productsCount: products.length,
          salesCount: sales.length,
          auditsCount: audits.length,
        });
      } else {
        throw new Error("Unrecognized backup file format.");
      }
    } catch (err: unknown) {
      console.error("Backup parse error:", err);
      const msg = err instanceof Error ? err.message : "Invalid JSON backup file.";
      setError(msg);
      setRawBackup(null);
      setPreview(null);
    }
  };

  const handleExecuteRestore = async () => {
    if (!rawBackup) return;

    setIsRestoring(true);
    setError(null);

    try {
      const result: RestoreBackupResult = await restoreInstanceBackupApi(rawBackup, mode);

      // Restore store settings to local storage and app state if present
      if (result.store_settings && typeof result.store_settings === "object" && onUpdateSettings) {
        onUpdateSettings(result.store_settings as StoreSettings);
      }

      await onRefreshInventory();

      showToast(
        `Successfully restored instance backup! (${result.products_restored} products, ${result.categories_restored} categories, ${result.sales_restored} sales)`,
        "success"
      );

      handleClose();
    } catch (err: unknown) {
      console.error("Restore failed:", err);
      const msg = err instanceof Error ? err.message : "Failed to restore backup.";
      setError(msg);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleClose = () => {
    if (isRestoring) return;
    setFile(null);
    setRawBackup(null);
    setPreview(null);
    setIsConfirmed(false);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
              <FileJson className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-zinc-900">
                Restore Instance Backup
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500">
                Recover all store data including products, categories, unit prices, stock, and transactions
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* File Picker */}
          {!preview && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer border-zinc-200 hover:border-zinc-300 bg-zinc-50/50 hover:bg-zinc-50 transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
              />
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center mx-auto mb-2.5">
                <UploadCloud className="w-5 h-5" />
              </div>
              <p className="font-semibold text-zinc-800">
                Choose a JSON backup file to restore
              </p>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Supports both Full Instance Snapshots and Legacy Product Backups
              </p>
              <Button type="button" variant="outline" size="sm" className="mt-3 text-xs">
                Select JSON Backup File
              </Button>
            </div>
          )}

          {/* Backup Inspection Breakdown */}
          {preview && (
            <div className="space-y-3">
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded bg-blue-700 text-white flex items-center justify-center">
                    <FileJson className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-zinc-900 block truncate max-w-xs">
                      {file?.name}
                    </span>
                    <span className="text-[11px] text-zinc-500 block">
                      {preview.isFullInstance
                        ? "Full Instance Snapshot"
                        : "Legacy Product Catalog Backup"}
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                    setRawBackup(null);
                    setIsConfirmed(false);
                  }}
                  className="text-xs text-zinc-500 hover:text-zinc-800"
                >
                  Change File
                </Button>
              </div>

              {/* Snapshot Info Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="p-2.5 bg-zinc-50 rounded-lg border border-zinc-200">
                  <div className="flex items-center justify-center gap-1 text-zinc-500 text-[10px] mb-0.5">
                    <Layers className="w-3 h-3" />
                    <span>Categories</span>
                  </div>
                  <span className="text-sm font-bold text-zinc-900">
                    {preview.categoriesCount}
                  </span>
                </div>

                <div className="p-2.5 bg-zinc-50 rounded-lg border border-zinc-200">
                  <div className="flex items-center justify-center gap-1 text-zinc-500 text-[10px] mb-0.5">
                    <Package className="w-3 h-3" />
                    <span>Products</span>
                  </div>
                  <span className="text-sm font-bold text-zinc-900">
                    {preview.productsCount}
                  </span>
                </div>

                <div className="p-2.5 bg-zinc-50 rounded-lg border border-zinc-200">
                  <div className="flex items-center justify-center gap-1 text-zinc-500 text-[10px] mb-0.5">
                    <ShoppingCart className="w-3 h-3" />
                    <span>Sales &amp; Utang</span>
                  </div>
                  <span className="text-sm font-bold text-zinc-900">
                    {preview.salesCount}
                  </span>
                </div>

                <div className="p-2.5 bg-zinc-50 rounded-lg border border-zinc-200">
                  <div className="flex items-center justify-center gap-1 text-zinc-500 text-[10px] mb-0.5">
                    <Calendar className="w-3 h-3" />
                    <span>Audits</span>
                  </div>
                  <span className="text-sm font-bold text-zinc-900">
                    {preview.auditsCount}
                  </span>
                </div>
              </div>

              {preview.storeName && (
                <div className="p-2.5 bg-blue-50/60 border border-blue-200 rounded-lg flex items-center justify-between text-[11px] text-blue-900">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Store className="w-3.5 h-3.5 text-blue-700" />
                    <span>Store: <strong>{preview.storeName}</strong></span>
                    {preview.ownerName && <span>({preview.ownerName})</span>}
                  </div>
                  {preview.exportedAt && (
                    <div className="flex items-center gap-1 text-blue-700 text-[10px]">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(preview.exportedAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Restore Mode Choice */}
              <div className="space-y-1.5 pt-1">
                <span className="font-semibold text-zinc-800 block">
                  Select Restore Mode:
                </span>
                <div className="space-y-1.5">
                  <label className="flex items-start gap-2 p-2.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 cursor-pointer">
                    <input
                      type="radio"
                      name="restore_mode"
                      value="full"
                      checked={mode === "full"}
                      onChange={() => setMode("full")}
                      className="mt-0.5 text-blue-600 focus:ring-blue-600"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-zinc-900">Clean Slate Restore</span>
                        <Badge variant="secondary" className="text-[10px]">Recommended</Badge>
                      </div>
                      <span className="text-zinc-500 block text-[11px] mt-0.5">
                        Wipes existing database and restores the exact state preserved in the backup file.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 p-2.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 cursor-pointer">
                    <input
                      type="radio"
                      name="restore_mode"
                      value="merge"
                      checked={mode === "merge"}
                      onChange={() => setMode("merge")}
                      className="mt-0.5 text-blue-600 focus:ring-blue-600"
                    />
                    <div>
                      <span className="font-semibold text-zinc-900">Merge / Catalog Sync</span>
                      <span className="text-zinc-500 block text-[11px] mt-0.5">
                        Updates/adds categories and products while preserving existing transactions.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Safety Confirmation Checkbox */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg">
                <label htmlFor={confirmCheckboxId} className="flex items-start gap-2 cursor-pointer">
                  <input
                    id={confirmCheckboxId}
                    type="checkbox"
                    checked={isConfirmed}
                    onChange={(e) => setIsConfirmed(e.target.checked)}
                    className="mt-0.5 rounded border-amber-300 text-amber-700 focus:ring-amber-700"
                  />
                  <div>
                    <div className="flex items-center gap-1 font-semibold text-amber-900">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                      <span>Confirm Restore Operation</span>
                    </div>
                    <span className="text-[11px] text-amber-800 block mt-0.5">
                      I understand that {mode === "full" ? "all current records will be replaced with this backup" : "existing items with matching barcodes will be updated"}.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-800 text-[11px]">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-zinc-100 pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClose}
            disabled={isRestoring}
            className="text-xs"
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleExecuteRestore}
            disabled={!preview || !isConfirmed || isRestoring}
            className="bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs gap-1.5"
          >
            {isRestoring ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Restoring Instance...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Restore Backup Now
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
