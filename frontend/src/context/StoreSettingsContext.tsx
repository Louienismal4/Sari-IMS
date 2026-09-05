"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { StoreSettings, UnitOfMeasure } from "@/types/inventory";
import { DEFAULT_STORE_SETTINGS, DEFAULT_UNITS } from "@/constants/defaults";
import { SETTINGS_STORAGE_KEY } from "@/constants/storage-keys";

interface StoreSettingsContextType {
  settings: StoreSettings;
  allUnits: UnitOfMeasure[];
  updateSettings: (newSettings: StoreSettings) => void;
}

const StoreSettingsContext = createContext<StoreSettingsContextType | undefined>(undefined);

function loadSettingsFromStorage(): StoreSettings {
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
    console.error("Failed to load store settings:", e);
  }
  return DEFAULT_STORE_SETTINGS;
}

export function StoreSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<StoreSettings>(() => loadSettingsFromStorage());

  const updateSettings = useCallback((newSettings: StoreSettings) => {
    setSettings(newSettings);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
      } catch (e) {
        console.error("Failed to save store settings:", e);
      }
    }
  }, []);

  const allUnits: UnitOfMeasure[] = [
    ...DEFAULT_UNITS,
    ...(settings.custom_units || []),
  ];

  return (
    <StoreSettingsContext.Provider value={{ settings, allUnits, updateSettings }}>
      {children}
    </StoreSettingsContext.Provider>
  );
}

export function useStoreSettings() {
  const context = useContext(StoreSettingsContext);
  if (!context) {
    throw new Error("useStoreSettings must be used within a StoreSettingsProvider");
  }
  return context;
}
