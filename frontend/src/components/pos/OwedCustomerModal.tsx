"use client";

import { useState, useEffect, useId } from "react";
import { BookUser, ArrowRight, User } from "lucide-react";
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

interface OwedCustomerModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  totalAmount: number;
  onConfirm: (customerData: {
    customer_name: string;
    customer_phone?: string;
    notes?: string;
  }) => Promise<void>;
  isProcessing: boolean;
  existingDebtorNames?: string[];
}

export function OwedCustomerModal({
  isOpen,
  onOpenChange,
  totalAmount,
  onConfirm,
  isProcessing,
  existingDebtorNames = [],
}: OwedCustomerModalProps) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");

  const nameInputId = useId();
  const phoneInputId = useId();
  const notesInputId = useId();

  // Reset inputs when opened
  useEffect(() => {
    if (isOpen) {
      setCustomerName("");
      setCustomerPhone("");
      setNotes("");
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || isProcessing) return;

    await onConfirm({
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-zinc-100 text-zinc-900 flex items-center justify-center">
              <BookUser className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">
                I-lista sa Utang (Credit Sale)
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500">
                Record owed items under customer name in the ledger
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Total Amount Banner */}
          <div className="bg-zinc-50 rounded-xl p-3.5 border border-zinc-200 text-center">
            <span className="text-[11px] font-mono uppercase tracking-wide text-zinc-500">
              Halaga ng Utang (Total Owed)
            </span>
            <p className="text-2xl font-black text-zinc-900 font-mono mt-0.5">
              ₱{totalAmount.toFixed(2)}
            </p>
          </div>

          {/* Customer Name Field */}
          <div className="space-y-1.5">
            <label htmlFor={nameInputId} className="text-xs font-semibold text-zinc-800">
              Pangalan ng Customer (Customer Name) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <Input
                id={nameInputId}
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Aling Nena, Kuya Jun"
                required
                autoFocus
                className="pl-9 h-11 bg-white text-sm"
              />
            </div>

            {/* Quick customer name chips if available */}
            {existingDebtorNames.length > 0 && !customerName && (
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[10px] text-zinc-400">Previous:</span>
                {existingDebtorNames.slice(0, 4).map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setCustomerName(name)}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium transition-colors"
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Phone Number (Optional) */}
          <div className="space-y-1.5">
            <label htmlFor={phoneInputId} className="text-xs font-medium text-zinc-700">
              Contact Number (Optional)
            </label>
            <Input
              id={phoneInputId}
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="e.g. 0917-xxx-xxxx"
              className="h-10 bg-white text-sm"
            />
          </div>

          {/* Notes / Due Date (Optional) */}
          <div className="space-y-1.5">
            <label htmlFor={notesInputId} className="text-xs font-medium text-zinc-700">
              Notes (e.g. Bayaran sa katapusan / sweldo)
            </label>
            <Input
              id={notesInputId}
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Pangako bayaran sa Biyernes"
              className="h-10 bg-white text-sm"
            />
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
              disabled={!customerName.trim() || isProcessing || totalAmount <= 0}
              className="bg-amber-600 hover:bg-amber-700 text-white gap-2 font-medium"
            >
              {isProcessing ? (
                "Recording..."
              ) : (
                <>
                  <span>I-lista ang Utang</span>
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
