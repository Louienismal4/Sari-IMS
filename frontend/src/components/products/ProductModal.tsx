"use client";

import { useId, useRef, useEffect, useState } from "react";
import { Percent, Layers, AlertCircle, PackageCheck, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Category, ProductFormData, UnitOfMeasure } from "@/types/inventory";

export interface ScannedItemModalContext {
  isScannedItem: boolean;
  matchedProductName?: string | null;
  currentStock?: number | null;
  initialUpdateMode?: "add" | "replace";
  onSaveUpdateMode?: (mode: "add" | "replace") => void;
}

interface ProductModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  modalMode: "create" | "edit";
  formData: ProductFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>;
  categories: Category[];
  units?: UnitOfMeasure[];
  onSubmit: (e: React.FormEvent) => Promise<void>;
  loading: boolean;
  formError: string | null;
  onConvertPackToPieces: () => void;
  scannedItemContext?: ScannedItemModalContext | null;
}

export function ProductModal({
  isOpen,
  onOpenChange,
  modalMode,
  formData,
  setFormData,
  categories,
  units,
  onSubmit,
  loading,
  formError,
  onConvertPackToPieces,
  scannedItemContext,
}: ProductModalProps) {
  const formNameId = useId();
  const formOriginalNameId = useId();
  const formBarcodeId = useId();
  const formCategoryId = useId();
  const formUnitId = useId();
  const formCostPriceId = useId();
  const formMarkupId = useId();
  const formSellingPriceId = useId();
  const formStockQuantityId = useId();
  const formReorderLevelId = useId();
  const formPackQtyId = useId();

  const modalNameInputRef = useRef<HTMLInputElement>(null);

  // Maintain local update mode inside modal to avoid polluting ProductFormData or mutating staging state before submit
  const [localUpdateMode, setLocalUpdateMode] = useState<"add" | "replace">(
    scannedItemContext?.initialUpdateMode || "add"
  );

  useEffect(() => {
    if (isOpen) {
      setLocalUpdateMode(scannedItemContext?.initialUpdateMode || "add");
      setTimeout(() => {
        modalNameInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, scannedItemContext?.initialUpdateMode]);

  const handleCostPriceChange = (newCostStr: string) => {
    const cost = parseFloat(newCostStr);
    const existingRetail = parseFloat(formData.selling_price);

    // ADR-0001: Only preserve shelf selling price when restocking an existing matched catalog product!
    const isRestockingMatchedProduct = !!(scannedItemContext && scannedItemContext.matchedProductName);

    if (isRestockingMatchedProduct && !isNaN(cost) && cost > 0 && !isNaN(existingRetail) && existingRetail > 0) {
      const computedMarkup = (((existingRetail - cost) / cost) * 100).toFixed(1);
      setFormData((prev) => ({
        ...prev,
        cost_price: newCostStr,
        markup_percent: computedMarkup,
      }));
      return;
    }

    const markup = parseFloat(formData.markup_percent);
    if (!isNaN(cost) && cost > 0 && !isNaN(markup)) {
      const computedRetail = (cost * (1 + markup / 100)).toFixed(2);
      setFormData((prev) => ({
        ...prev,
        cost_price: newCostStr,
        selling_price: computedRetail,
      }));
    } else {
      setFormData((prev) => ({ ...prev, cost_price: newCostStr }));
    }
  };

  const handleMarkupPercentChange = (newMarkupStr: string) => {
    const markup = parseFloat(newMarkupStr);
    const cost = parseFloat(formData.cost_price);
    if (!isNaN(cost) && cost > 0 && !isNaN(markup)) {
      const computedRetail = (cost * (1 + markup / 100)).toFixed(2);
      setFormData((prev) => ({
        ...prev,
        markup_percent: newMarkupStr,
        selling_price: computedRetail,
      }));
    } else {
      setFormData((prev) => ({ ...prev, markup_percent: newMarkupStr }));
    }
  };

  const handleSellingPriceChange = (newRetailStr: string) => {
    const retail = parseFloat(newRetailStr);
    const cost = parseFloat(formData.cost_price);
    if (!isNaN(retail) && !isNaN(cost) && cost > 0) {
      const computedMarkup = (((retail - cost) / cost) * 100).toFixed(1);
      setFormData((prev) => ({
        ...prev,
        selling_price: newRetailStr,
        markup_percent: computedMarkup,
      }));
    } else {
      setFormData((prev) => ({ ...prev, selling_price: newRetailStr }));
    }
  };

  const toggleModalUpdateMode = () => {
    setLocalUpdateMode((prev) => (prev === "replace" ? "add" : "replace"));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (scannedItemContext?.onSaveUpdateMode) {
      scannedItemContext.onSaveUpdateMode(localUpdateMode);
    }
    await onSubmit(e);
  };

  // Calculations
  const costVal = parseFloat(formData.cost_price) || 0;
  const retailVal = parseFloat(formData.selling_price) || 0;
  const tuboVal = retailVal - costVal;
  const markupVal = costVal > 0 ? ((tuboVal / costVal) * 100).toFixed(1) : "0";

  const isMultiUnit = ["pack", "box", "case", "dozen", "sachet", "pouch", "bundle"].includes(formData.unit);
  const packUnitsCount = parseInt(formData.pieces_per_pack) || 1;
  const pieceCost = packUnitsCount > 0 ? (costVal / packUnitsCount).toFixed(2) : "0.00";
  const pieceRetail = packUnitsCount > 0 ? (retailVal / packUnitsCount).toFixed(2) : "0.00";
  const pieceProfit = packUnitsCount > 0 ? (tuboVal / packUnitsCount).toFixed(2) : "0.00";

  const availableUnits = units && units.length > 0 ? units : [
    { id: "pc", name: "pc", label: "Piece (pc)" },
    { id: "pack", name: "pack", label: "Pack" },
    { id: "box", name: "box", label: "Box" },
    { id: "sachet", name: "sachet", label: "Sachet" },
    { id: "can", name: "can", label: "Can" },
    { id: "bottle", name: "bottle", label: "Bottle" },
    { id: "pouch", name: "pouch", label: "Pouch" },
    { id: "dozen", name: "dozen", label: "Dozen (12 pcs)" },
    { id: "kg", name: "kg", label: "Kilogram (kg)" },
    { id: "g", name: "g", label: "Gram (g)" },
    { id: "L", name: "L", label: "Liter (L)" },
    { id: "mL", name: "mL", label: "Milliliter (mL)" },
    { id: "bar", name: "bar", label: "Bar (Soap/Snack)" },
    { id: "roll", name: "roll", label: "Roll" },
    { id: "bundle", name: "bundle", label: "Bundle" },
  ];

  // Shared Sub-renderers
  const renderPricingGrid = () => (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
      <div className="space-y-1">
        <label htmlFor={formCostPriceId} className="text-[11px] font-semibold text-zinc-700">
          Wholesale / Capital (₱) *
        </label>
        <Input
          id={formCostPriceId}
          type="number"
          step="0.01"
          min="0"
          required
          placeholder="12.50"
          value={formData.cost_price}
          onChange={(e) => handleCostPriceChange(e.target.value)}
          className="font-mono"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor={formMarkupId} className="text-[11px] font-semibold text-zinc-700 flex items-center justify-between">
          <span>Markup (%)</span>
          <Percent className="w-3 h-3 text-zinc-400" />
        </label>
        <Input
          id={formMarkupId}
          type="number"
          step="0.1"
          placeholder="25"
          value={formData.markup_percent}
          onChange={(e) => handleMarkupPercentChange(e.target.value)}
          className="font-mono text-emerald-700 font-semibold"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor={formSellingPriceId} className="text-[11px] font-semibold text-zinc-700">
          Retail / Shelf Price (₱) *
        </label>
        <Input
          id={formSellingPriceId}
          type="number"
          step="0.01"
          min="0"
          required
          placeholder="16.00"
          value={formData.selling_price}
          onChange={(e) => handleSellingPriceChange(e.target.value)}
          className="font-mono font-bold text-zinc-900"
        />
      </div>
    </div>
  );

  const renderMarginPreviewBar = () => (
    <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg flex items-center justify-between text-xs">
      <div>
        <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Tubo Breakdown</span>
        <span className="text-zinc-600 text-[11px]">
          ₱{costVal.toFixed(2)} → ₱{retailVal.toFixed(2)}
        </span>
      </div>
      <div className="text-right">
        <span className="font-mono font-bold text-emerald-600 text-xs block">
          +₱{tuboVal.toFixed(2)} Tubo
        </span>
        <span className="text-[10px] text-zinc-400 font-mono">({markupVal}% Margin)</span>
      </div>
    </div>
  );

  const renderBarcodeAndCategory = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="space-y-1">
        <label htmlFor={formBarcodeId} className="text-[11px] font-semibold text-zinc-700">
          Barcode / SKU
        </label>
        <Input
          id={formBarcodeId}
          type="text"
          placeholder="4800016644810"
          value={formData.barcode}
          onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
          className="font-mono text-xs h-8"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor={formCategoryId} className="text-[11px] font-semibold text-zinc-700">
          Category
        </label>
        <select
          id={formCategoryId}
          value={formData.category_id}
          onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
          className="flex h-8 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-900 shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950"
        >
          <option value="">Uncategorized</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  const renderReorderLevel = () => (
    <div className="space-y-1">
      <label htmlFor={formReorderLevelId} className="text-[11px] font-semibold text-zinc-700">
        Reorder Alert Level
      </label>
      <Input
        id={formReorderLevelId}
        type="number"
        min="0"
        placeholder="5"
        value={formData.reorder_level}
        onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
        className="font-mono text-xs h-8"
      />
    </div>
  );

  const renderPackConversionSection = () => {
    if (!isMultiUnit) return null;
    return (
      <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-950">
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span>Pack Conversion ({formData.unit.toUpperCase()})</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onConvertPackToPieces}
            className="h-6 text-[10px] bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-100"
          >
            Sell by Individual Piece
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="space-y-1">
            <label htmlFor={formPackQtyId} className="text-[11px] font-medium text-indigo-900">
              How many pieces in this {formData.unit}?
            </label>
            <Input
              id={formPackQtyId}
              type="number"
              min="1"
              placeholder="12"
              value={formData.pieces_per_pack}
              onChange={(e) => setFormData({ ...formData, pieces_per_pack: e.target.value })}
              className="h-7 text-xs bg-white font-mono"
            />
          </div>

          <div className="p-2 bg-white/90 rounded-lg border border-indigo-100 text-[11px] space-y-0.5 font-mono">
            <div className="flex justify-between text-zinc-600">
              <span>Cost / piece:</span>
              <span className="font-semibold text-zinc-900">₱{pieceCost}</span>
            </div>
            <div className="flex justify-between text-zinc-600">
              <span>Retail / piece:</span>
              <span className="font-bold text-zinc-900">₱{pieceRetail}</span>
            </div>
            <div className="flex justify-between text-emerald-600 pt-0.5 border-t border-zinc-100">
              <span>Profit / piece:</span>
              <span className="font-bold">+₱{pieceProfit}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {scannedItemContext
              ? scannedItemContext.matchedProductName
                ? "Edit Restock Item"
                : "Edit Scanned Item"
              : modalMode === "edit"
              ? "Edit Product Details"
              : "Add New Product to Ledger"}
          </DialogTitle>
          <DialogDescription>
            {scannedItemContext
              ? "Configure wholesale cost, retail shelf price, restock quantity, and restock update mode."
              : modalMode === "edit"
              ? "Update pricing, margin, unit packaging, or reorder threshold."
              : "Fill in product pricing and stock details to save directly into the store catalog."}
          </DialogDescription>
        </DialogHeader>

        {/* Form Error Banner */}
        {formError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Scanned / Restock Context Card */}
        {scannedItemContext && (
          <div className="p-3 bg-emerald-50/90 border border-emerald-200 rounded-xl space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-950 min-w-0">
                <PackageCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                {scannedItemContext.matchedProductName ? (
                  <span className="truncate">
                    Restocking: <strong>{scannedItemContext.matchedProductName}</strong>
                  </span>
                ) : (
                  <span>New Catalog Product (Unmatched)</span>
                )}
              </div>
              {scannedItemContext.matchedProductName && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={toggleModalUpdateMode}
                  className="h-6 text-[10px] bg-white border-emerald-300 text-emerald-800 hover:bg-emerald-100 shrink-0 font-medium"
                >
                  Mode: {localUpdateMode === "replace" ? "Replace Stock" : "Add (+)"}
                </Button>
              )}
            </div>
            {scannedItemContext.matchedProductName && (
              <div className="flex items-center justify-between text-[11px] font-mono text-emerald-800 pt-1.5 border-t border-emerald-200/70">
                <span>
                  Current in store: <strong>{scannedItemContext.currentStock ?? 0} {formData.unit}</strong>
                </span>
                <span>
                  {localUpdateMode === "replace"
                    ? `New total: ${formData.stock_quantity || 0} ${formData.unit}`
                    : `New total: ${(scannedItemContext.currentStock ?? 0) + (parseInt(formData.stock_quantity, 10) || 0)} ${formData.unit}`}
                </span>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-4 pt-1">
          {scannedItemContext ? (
            <>
              {/* Product Name & Unit in a single row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label htmlFor={formNameId} className="text-xs font-semibold text-zinc-700">
                    Product Name *
                  </label>
                  <Input
                    id={formNameId}
                    ref={modalNameInputRef}
                    type="text"
                    required
                    placeholder="e.g. Kopiko Brown Coffee 30g"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor={formUnitId} className="text-xs font-semibold text-zinc-700">
                    Unit *
                  </label>
                  <select
                    id={formUnitId}
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="flex h-8 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-900 shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950"
                  >
                    {availableUnits.map((u) => (
                      <option key={u.id} value={u.name}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {renderPricingGrid()}
              {renderMarginPreviewBar()}

              {/* Stock Quantity */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label htmlFor={formStockQuantityId} className="text-xs font-semibold text-zinc-700">
                    Restock Quantity to {localUpdateMode === "replace" ? "Set" : "Add"} *
                  </label>
                  {scannedItemContext.matchedProductName && (
                    <span className="text-[11px] font-mono text-emerald-700">
                      {localUpdateMode === "replace"
                        ? `Sets total to: ${formData.stock_quantity || 0} ${formData.unit}`
                        : `${scannedItemContext.currentStock ?? 0} current + ${formData.stock_quantity || 0} = ${(scannedItemContext.currentStock ?? 0) + (parseInt(formData.stock_quantity, 10) || 0)} ${formData.unit}`}
                    </span>
                  )}
                </div>
                <Input
                  id={formStockQuantityId}
                  type="number"
                  min="1"
                  required
                  placeholder="10"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                  className="font-mono text-sm font-semibold"
                />
              </div>

              {renderPackConversionSection()}

              {/* Collapsible Additional Details */}
              <details className="group border border-zinc-200 rounded-xl bg-zinc-50/50 p-2.5 transition-all">
                <summary className="text-xs font-semibold text-zinc-600 cursor-pointer list-none flex items-center justify-between hover:text-zinc-900 select-none">
                  <span>Additional Details (Category, SKU, Reorder Alert)</span>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="pt-3 space-y-3 border-t border-zinc-200/80 mt-2">
                  {formData.original_name && formData.original_name !== formData.name && (
                    <div className="space-y-1">
                      <label htmlFor={formOriginalNameId} className="text-[11px] font-semibold text-zinc-500">
                        Original Receipt Name
                      </label>
                      <Input
                        id={formOriginalNameId}
                        type="text"
                        readOnly
                        value={formData.original_name}
                        className="bg-white text-zinc-600 font-mono text-xs cursor-default h-8"
                      />
                    </div>
                  )}

                  {renderBarcodeAndCategory()}
                  {renderReorderLevel()}
                </div>
              </details>
            </>
          ) : (
            <>
              {/* Product Name */}
              <div className="space-y-1">
                <label htmlFor={formNameId} className="text-xs font-semibold text-zinc-700">
                  Product Name *
                </label>
                <Input
                  id={formNameId}
                  ref={modalNameInputRef}
                  type="text"
                  required
                  placeholder="e.g. Kopiko Brown Coffee 30g"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              {formData.original_name && formData.original_name !== formData.name && (
                <div className="space-y-1">
                  <label htmlFor={formOriginalNameId} className="text-xs font-semibold text-zinc-500">
                    Original Receipt Name
                  </label>
                  <Input
                    id={formOriginalNameId}
                    type="text"
                    readOnly
                    value={formData.original_name}
                    className="bg-zinc-50 text-zinc-600 font-mono text-xs cursor-default"
                  />
                </div>
              )}

              {renderBarcodeAndCategory()}
              {renderPricingGrid()}
              {renderMarginPreviewBar()}

              {/* Unit & Stock Quantity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor={formUnitId} className="text-xs font-semibold text-zinc-700">
                    Unit *
                  </label>
                  <select
                    id={formUnitId}
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="flex h-8 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-900 shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950"
                  >
                    {availableUnits.map((u) => (
                      <option key={u.id} value={u.name}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor={formStockQuantityId} className="text-xs font-semibold text-zinc-700">
                    Initial Stock Quantity *
                  </label>
                  <Input
                    id={formStockQuantityId}
                    type="number"
                    min="0"
                    required
                    placeholder="10"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                    className="font-mono text-xs"
                  />
                </div>
              </div>

              {renderPackConversionSection()}
              {renderReorderLevel()}
            </>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Saving..."
                : scannedItemContext
                ? "Save Item Details"
                : modalMode === "edit"
                ? "Save Changes"
                : "Create Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
