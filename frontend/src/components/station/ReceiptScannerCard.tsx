"use client";

import { RefObject } from "react";
import { UploadCloud, Loader2, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScanQuota } from "@/types/inventory";

interface ReceiptScannerCardProps {
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  scanning: boolean;
  selectedReceiptPreview: string | null;
  onClearPreview: () => void;
  scannedCount: number;
  scanQuota: ScanQuota | null;
}

export function ReceiptScannerCard({
  fileInputRef,
  onFileChange,
  scanning,
  selectedReceiptPreview,
  onClearPreview,
  scannedCount,
  scanQuota,
}: ReceiptScannerCardProps) {
  return (
    <Card className="shadow-2xs border-zinc-200">
      <CardHeader className="p-4 pb-3">
        <div>
          <CardTitle className="text-sm font-bold text-zinc-900">Scan receipt</CardTitle>
          <CardDescription className="text-xs text-zinc-500">
            Snap or upload store receipt to auto-extract items
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 space-y-3">
        {/* Dropzone */}
        <label
          htmlFor="receipt-upload"
          className={`w-full border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-2 relative ${
            scanning
              ? "border-zinc-400 bg-zinc-50/40 pointer-events-none"
              : "border-zinc-200 hover:border-zinc-400 bg-zinc-50/50 hover:bg-zinc-50"
          }`}
        >
          <input
            id="receipt-upload"
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            onChange={onFileChange}
            disabled={scanning}
            className="sr-only"
          />
          {scanning ? (
            <div className="flex flex-col items-center gap-2 text-zinc-700 py-2">
              <Loader2 className="w-6 h-6 animate-spin motion-reduce:animate-none text-zinc-900" />
              <span className="text-xs font-semibold text-zinc-900">
                Extracting receipt line items...
              </span>
              <span className="text-xs text-zinc-500 font-mono">
                Extracting SKUs, wholesale costs &amp; quantities
              </span>
            </div>
          ) : (
            <>
              <div className="w-9 h-9 rounded-full bg-zinc-100 text-zinc-700 flex items-center justify-center">
                <UploadCloud className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-zinc-800 block">
                  Upload Receipt Photo
                </span>
                <span className="text-xs text-zinc-500 font-mono">
                  JPG, PNG, WEBP (Puregold, Wholesaler)
                </span>
              </div>
            </>
          )}
        </label>

        {/* Thumbnail Preview */}
        {selectedReceiptPreview && (
          <div className="flex items-center justify-between p-2.5 bg-zinc-50 rounded-lg border border-zinc-200">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedReceiptPreview}
                alt="Uploaded receipt preview"
                className="w-10 h-10 object-cover rounded border border-zinc-200 shrink-0"
              />
              <div className="min-w-0">
                <span className="text-xs font-semibold text-zinc-800 block truncate">
                  Receipt Image Loaded
                </span>
                <span className="text-xs text-zinc-500 font-mono block">
                  {scannedCount} items in queue
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClearPreview}
              className="h-9 w-9 min-h-[44px] min-w-[44px] text-zinc-400 hover:text-zinc-700 shrink-0"
              title="Dismiss preview"
              aria-label="Dismiss receipt preview"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Quota Indicator */}
        <div className="pt-2 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-zinc-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-xs font-medium">
              {scanQuota
                ? `${scanQuota.scans_remaining_today.toLocaleString()} of ${scanQuota.daily_limit.toLocaleString()} scans left today`
                : "1,500 scans left today"}
            </span>
          </div>
          <span className="text-xs text-zinc-500 font-mono">
            {scanQuota?.tokens_used_last_scan
              ? `~${scanQuota.tokens_used_last_scan} tokens/scan`
              : "Google AI Studio Free Tier"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
