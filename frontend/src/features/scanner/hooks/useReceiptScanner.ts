"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { ScannedItem, ScanQuota } from "@/features/scanner/types/scanner.types";
import { fetchScanQuota, scanReceiptImage } from "@/features/scanner/api/scannerService";
import { processImageFile } from "@/lib/image-processor";
import { RECEIPT_PREVIEW_SESSION_KEY } from "@/constants/storage-keys";

interface UseReceiptScannerOptions {
  onItemsScanned?: (items: ScannedItem[]) => void;
  showToast?: (message: string, type?: "success" | "error" | "info" | "warning") => void;
}

export function useReceiptScanner(options?: UseReceiptScannerOptions) {
  const [scanning, setScanning] = useState(false);
  const [scanQuota, setScanQuota] = useState<ScanQuota | null>(null);
  const [selectedReceiptPreview, setSelectedReceiptPreview] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return sessionStorage.getItem(RECEIPT_PREVIEW_SESSION_KEY);
    } catch {
      return null;
    }
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadQuota = useCallback(async () => {
    try {
      const q = await fetchScanQuota();
      setScanQuota(q);
    } catch (e) {
      console.error("Failed to fetch scan quota:", e);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    fetchScanQuota()
      .then((q) => {
        if (!ignore) setScanQuota(q);
      })
      .catch((e) => console.error("Failed to fetch scan quota:", e));

    return () => {
      ignore = true;
    };
  }, []);

  const clearPreview = useCallback(() => {
    setSelectedReceiptPreview(null);
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem(RECEIPT_PREVIEW_SESSION_KEY);
      } catch {}
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const previewUrl = URL.createObjectURL(file);
      setSelectedReceiptPreview(previewUrl);
      setScanning(true);

      try {
        const base64Data = await processImageFile(file);
        if (!base64Data) throw new Error("Unable to read image file.");

        const result = await scanReceiptImage(base64Data);
        if (result.quota) {
          setScanQuota(result.quota);
        }

        if (result.data.length === 0) {
          options?.showToast?.("Analyzed receipt, but found no line items.", "warning");
        } else {
          options?.onItemsScanned?.(result.data);
          options?.showToast?.(
            `Extracted ${result.data.length} items into staging queue!`,
            "success"
          );
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Receipt scanning failed.";
        options?.showToast?.(message, "error");
      } finally {
        setScanning(false);
      }
    },
    [options]
  );

  return {
    scanning,
    scanQuota,
    selectedReceiptPreview,
    fileInputRef,
    onFileChange: handleFileChange,
    onClearPreview: clearPreview,
    refreshQuota: loadQuota,
  };
}
