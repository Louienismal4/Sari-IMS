import { StoreSettings } from "@/types/inventory";
import { DEFAULT_STORE_SETTINGS } from "@/constants/defaults";
import { SETTINGS_STORAGE_KEY } from "@/constants/storage-keys";

export * from "@/constants/defaults";
export * from "@/constants/storage-keys";
export * from "@/features/settings/api/databaseAdminService";

export function loadStoreSettings(): StoreSettings {
  if (typeof window === "undefined") return DEFAULT_STORE_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_STORE_SETTINGS,
        ...parsed,
        custom_units: Array.isArray(parsed.custom_units) ? parsed.custom_units : [],
      };
    }
  } catch (e) {
    console.error("Failed to load settings:", e);
  }
  return DEFAULT_STORE_SETTINGS;
}

export function saveStoreSettings(settings: StoreSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save settings:", e);
  }
}
