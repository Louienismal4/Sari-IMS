"use client";

import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void> | void;
  title?: string;
  description?: string;
  itemName?: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
}

export function DeleteConfirmationModal({
  isOpen,
  onOpenChange,
  onConfirm,
  title = "Confirm Deletion",
  description,
  itemName,
  confirmText = "Delete",
  cancelText = "Cancel",
  loading = false,
}: DeleteConfirmationModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="space-y-2.5">
          <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <DialogTitle className="text-base font-bold text-zinc-900">
              {title}
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500 pt-1 leading-relaxed">
              {description ? (
                description
              ) : itemName ? (
                <>
                  Are you sure you want to delete{" "}
                  <span className="font-semibold text-zinc-800">
                    &quot;{itemName}&quot;
                  </span>
                  ? This action will permanently remove it from your records and cannot be undone.
                </>
              ) : (
                "Are you sure you want to proceed with this deletion? This action cannot be undone."
              )}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-lg flex items-start gap-2 text-xs text-amber-800">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            Ensure all linked stock adjustments or sales for this item have been reviewed before confirming.
          </span>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button
            type="button"
            variant="secondary"
            disabled={loading}
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={loading}
            onClick={onConfirm}
            className="gap-1.5 text-xs"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin motion-reduce:animate-none" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>{confirmText}</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
