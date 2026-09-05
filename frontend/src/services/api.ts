import { getBaseApiUrl } from "@/lib/api-client";

export function getApiUrl(): string {
  return getBaseApiUrl();
}

export async function handleApiResponse<T>(res: Response, fallbackMessage: string): Promise<T> {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    let errorMsg = json.message || fallbackMessage;
    if (json.errors && typeof json.errors === "object") {
      const details = Object.values(json.errors).flat().join(". ");
      if (details) errorMsg = details;
    }
    throw new Error(errorMsg);
  }
  return (json.data !== undefined ? json.data : json) as T;
}
