"use client";

import { useState, useEffect } from "react";
import { Layers, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScannedItem } from "@/features/scanner/types/scanner.types";

interface PackConversionModalProps {
  isOpen: boolean;
  onClose: () => void;
  scannedItem: ScannedItem | null;
  onApplyConversion: (piecesPerPack: number) => void;
}

export function PackConversionModal({
  isOpen,
  onClose,
  scannedItem,
  onApplyConversion,
}: PackConversionModalProps) {
  const [piecesStr, setPiecesStr] = useState("10");

  useEffect(() => {
    if (isOpen) {
      setPiecesStr("10");
    }
  }, [isOpen]);

  if (!scannedItem) return null;

  const rawQty = scannedItem.stock_quantity || 1;
  const rawCost = parseFloat(scannedItem.cost_price || "0");
  const pieces = parseInt(piecesStr, 10) || 1;

  const convertedQty = rawQty * pieces;
  const convertedCost = pieces > 0 ? rawCost / pieces : rawCost;
  const targetUnit = scannedItem.catalog_unit || "pc";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-white p-6">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2 text-amber-600">
            <Layers className="w-5 h-5" />
            <DialogTitle className="text-base font-bold text-zinc-900">
              Convert Pack to Pieces
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-zinc-500">
            Receipt was scanned as &quot;{scannedItem.unit}&quot;, but catalog product &quot;{scannedItem.matched_product_name}&quot; is tracked in &quot;{targetUnit}&quot;.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
              How many {targetUnit}s are in 1 {scannedItem.unit}?
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="1"
                step="1"
                value={piecesStr}
                onChange={(e) => setPiecesStr(e.target.value)}
                className="font-mono text-sm h-9"
                autoFocus
              />
              <span className="text-xs text-zinc-500 font-mono">pieces per {scannedItem.unit}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-[11px] text-zinc-400">Quick presets:</span>
              {[6, 10, 12, 20, 24].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setPiecesStr(String(preset))}
                  className={`text-[11px] font-mono px-2 py-0.5 rounded border transition-colors ${
                    pieces === preset
                      ? "bg-zinc-900 text-white border-zinc-900"
                      : "bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-200"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Before & After comparison card */}
          <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200 text-xs space-y-2">
            <div className="font-semibold text-zinc-800 text-[11px] uppercase tracking-wider">
              Conversion Preview
            </div>
            <div className="grid grid-cols-2 gap-3 items-center font-mono">
              <div className="p-2 bg-white rounded border border-zinc-200 space-y-0.5">
                <div className="text-[10px] text-zinc-400">Receipt Wholesale</div>
                <div className="font-bold text-zinc-900">{rawQty} {scannedItem.unit}</div>
                <div className="text-[11px] text-zinc-500">₱{rawCost.toFixed(2)} / {scannedItem.unit}</div>
              </div>

              <div className="p-2 bg-emerald-50/70 border border-emerald-200 rounded space-y-0.5">
                <div className="text-[10px] text-emerald-700 font-medium">Inventory Stock-In</div>
                <div className="font-bold text-emerald-900 flex items-center gap-1">
                  <span>{convertedQty} {targetUnit}</span>
                  <ArrowRight className="w-3 h-3 text-emerald-600" />
                </div>
                <div className="text-[11px] text-emerald-700">₱{convertedCost.toFixed(2)} / {targetUnit}</div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 text-xs text-zinc-600">
            Cancel
          </Button>
          <Button
            variant="emerald"
            size="sm"
            onClick={() => {
              onApplyConversion(pieces);
              onClose();
            }}
            className="h-8 text-xs"
            disabled={pieces <= 0}
          >
            Apply Conversion
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
