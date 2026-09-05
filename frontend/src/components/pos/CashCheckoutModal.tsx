"use client";

import { useState, useEffect, useId } from "react";
import { Banknote, CheckCircle2, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CashCheckoutModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  totalAmount: number;
  onConfirm: (amountTendered: number) => Promise<void>;
  isProcessing: boolean;
}

const COMMON_BILLS = [20, 50, 100, 200, 500, 1000];

export function CashCheckoutModal({
  isOpen,
  onOpenChange,
  totalAmount,
  onConfirm,
  isProcessing,
}: CashCheckoutModalProps) {
  const [tenderedInput, setTenderedInput] = useState<string>("");
  const inputId = useId();

  // Reset or preset tendered amount when modal opens
  useEffect(() => {
    if (isOpen) {
      setTenderedInput(totalAmount > 0 ? totalAmount.toString() : "");
    }
  }, [isOpen, totalAmount]);

  const tenderedNumber = parseFloat(tenderedInput) || 0;
  const change = Math.max(0, tenderedNumber - totalAmount);
  const isInsufficient = tenderedNumber < totalAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isInsufficient || isProcessing) return;
    await onConfirm(tenderedNumber);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">Cash Checkout</DialogTitle>
              <DialogDescription className="text-xs text-zinc-500">
                Receive customer payment and calculate change
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Total Amount Banner */}
          <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-200 text-center">
            <span className="text-xs font-mono uppercase tracking-wide text-zinc-500">
              Total Amount Due
            </span>
            <p className="text-3xl font-extrabold text-zinc-900 font-mono mt-1">
              ₱{totalAmount.toFixed(2)}
            </p>
          </div>

          {/* Amount Tendered Input */}
          <div className="space-y-1.5">
            <label htmlFor={inputId} className="text-xs font-medium text-zinc-700">
              Cash Received (₱)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400">
                ₱
              </span>
              <Input
                id={inputId}
                type="number"
                step="any"
                min="0"
                value={tenderedInput}
                onChange={(e) => setTenderedInput(e.target.value)}
                autoFocus
                className="pl-8 h-12 text-lg font-mono font-bold bg-white"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Quick Cash Presets */}
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-zinc-500">Quick Cash Presets:</span>
            <div className="grid grid-cols-4 gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTenderedInput(totalAmount.toString())}
                className="text-xs h-8 font-mono bg-zinc-50 hover:bg-zinc-100"
              >
                Exact
              </Button>
              {COMMON_BILLS.filter((bill) => bill >= totalAmount).slice(0, 3).map((bill) => (
                <Button
                  key={bill}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setTenderedInput(bill.toString())}
                  className="text-xs h-8 font-mono bg-zinc-50 hover:bg-zinc-100"
                >
                  ₱{bill}
                </Button>
              ))}
            </div>
          </div>

          {/* Change Display Card */}
          <div
            className={`rounded-xl p-3 border transition-colors ${
              isInsufficient
                ? "bg-rose-50/50 border-rose-200"
                : "bg-emerald-50/60 border-emerald-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-xs font-semibold ${
                  isInsufficient ? "text-rose-700" : "text-emerald-800"
                }`}
              >
                {isInsufficient ? "Kulay / Short Amount" : "Change to Return"}
              </span>
              <span
                className={`text-xl font-bold font-mono ${
                  isInsufficient ? "text-rose-600" : "text-emerald-700"
                }`}
              >
                {isInsufficient
                  ? `-₱${(totalAmount - tenderedNumber).toFixed(2)}`
                  : `₱${change.toFixed(2)}`}
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isInsufficient || isProcessing || totalAmount <= 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-medium"
            >
              {isProcessing ? (
                "Processing..."
              ) : (
                <>
                  <span>Complete Cash Sale</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
