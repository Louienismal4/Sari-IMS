import { ScannedItem, ScanQuota } from "@/features/scanner/types/scanner.types";
import { apiClient } from "@/lib/api-client";

export async function fetchScanQuota(): Promise<ScanQuota> {
  return apiClient<ScanQuota>("/scan-quota");
}

export async function scanReceiptImage(
  imageBase64: string
): Promise<{ data: ScannedItem[]; quota?: ScanQuota }> {
  const res = await apiClient<{ data: ScannedItem[]; quota?: ScanQuota } | ScannedItem[]>("/scan-receipt", {
    method: "POST",
    body: { image_base64: imageBase64 },
  });

  if (Array.isArray(res)) {
    return { data: res };
  }

  return {
    data: res.data || [],
    quota: res.quota,
  };
}
