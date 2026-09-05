"use client";

import { useId, useRef, useEffect } from "react";
import { Percent, Layers, AlertCircle } from "lucide-react";
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

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        modalNameInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const handleCostPriceChange = (newCostStr: string) => {
    const cost = parseFloat(newCostStr);
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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {modalMode === "edit" ? "Edit Product Details" : "Add New Product to Ledger"}
          </DialogTitle>
          <DialogDescription>
            {modalMode === "edit"
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

        <form onSubmit={onSubmit} className="space-y-4 pt-1">
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

          {/* Original Name Reference */}
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

          {/* Barcode & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor={formBarcodeId} className="text-xs font-semibold text-zinc-700">
                Barcode / SKU
              </label>
              <Input
                id={formBarcodeId}
                type="text"
                placeholder="4800016644810"
                value={formData.barcode || ""}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                className="font-mono"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor={formCategoryId} className="text-xs font-semibold text-zinc-700">
                Category
              </label>
              <select
                id={formCategoryId}
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="flex h-8 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-900 shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950"
              >
                <option value="">-- Uncategorized --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Unit & Reorder Threshold */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor={formUnitId} className="text-xs font-semibold text-zinc-700">
                Unit of Measure *
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
              <label htmlFor={formReorderLevelId} className="text-xs font-semibold text-zinc-700">
                Reorder Alert Level
              </label>
              <Input
                id={formReorderLevelId}
                type="number"
                min="0"
                placeholder="5"
                value={formData.reorder_level}
                onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
                className="font-mono"
              />
            </div>
          </div>

          {/* Multi-Unit Pack Breakdown */}
          {isMultiUnit && (
            <div className="p-3 bg-indigo-50/70 border border-indigo-200/80 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-900">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>Package Breakdown ({formData.unit.toUpperCase()})</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onConvertPackToPieces}
                  className="h-6 text-[10px] bg-white border-indigo-300 text-indigo-700 hover:bg-indigo-100"
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
          )}

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="space-y-1">
              <label htmlFor={formCostPriceId} className="text-[11px] font-semibold text-zinc-700">
                Capital (₱) *
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
                Retail Price (₱) *
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

          {/* Stock Quantity */}
          <div className="space-y-1">
            <label htmlFor={formStockQuantityId} className="text-[11px] font-semibold text-zinc-700">
              Current Stock Quantity *
            </label>
            <Input
              id={formStockQuantityId}
              type="number"
              min="0"
              required
              placeholder="24"
              value={formData.stock_quantity}
              onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
              className="font-mono"
            />
          </div>

          {/* Profit Margin Preview Bar */}
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
              {loading ? "Saving..." : modalMode === "edit" ? "Save Changes" : "Create Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
