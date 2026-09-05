import { StoreSettings, UnitOfMeasure } from "@/types/inventory";

export const DEFAULT_UNITS: UnitOfMeasure[] = [
  { id: "pc", name: "pc", label: "Piece (pc)" },
  { id: "pack", name: "pack", label: "Pack" },
  { id: "box", name: "box", label: "Box" },
  { id: "sachet", name: "sachet", label: "Sachet" },
  { id: "can", name: "can", label: "Can" },
  { id: "bottle", name: "bottle", label: "Bottle" },
  { id: "pouch", name: "pouch", label: "Pouch" },
  { id: "dozen", name: "dozen", label: "Dozen (12 pcs)" },
  { id: "kg", name: "kg", label: "Kilogram (kg)" },
  { id: "g", name: "g", label: "Gram (g)" },
  { id: "L", name: "L", label: "Liter (L)" },
  { id: "mL", name: "mL", label: "Milliliter (mL)" },
  { id: "bar", name: "bar", label: "Bar (Soap/Snack)" },
  { id: "roll", name: "roll", label: "Roll" },
  { id: "bundle", name: "bundle", label: "Bundle" },
];

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  store_name: "Aling Nena's Sari-Sari Store",
  owner_name: "Store Owner",
  currency_symbol: "₱",
  default_markup_percent: "25",
  default_reorder_level: "5",
  enable_audio_beeper: true,
  enable_haptic_feedback: true,
  custom_units: [],
};
