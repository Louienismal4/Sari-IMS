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

export interface CurrencyOption {
  code: string;
  symbol: string;
  name: string;
}

export const SUPPORTED_CURRENCIES: CurrencyOption[] = [
  { code: "PHP", symbol: "₱", name: "Philippine Peso (₱)" },
  { code: "USD", symbol: "$", name: "US Dollar ($)" },
  { code: "EUR", symbol: "€", name: "Euro (€)" },
  { code: "GBP", symbol: "£", name: "British Pound (£)" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen (¥)" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar (C$)" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar (A$)" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar (S$)" },
  { code: "MYR", symbol: "RM", name: "Malaysian Ringgit (RM)" },
  { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah (Rp)" },
  { code: "THB", symbol: "฿", name: "Thai Baht (฿)" },
  { code: "VND", symbol: "₫", name: "Vietnamese Dong (₫)" },
  { code: "INR", symbol: "₹", name: "Indian Rupee (₹)" },
  { code: "KRW", symbol: "₩", name: "South Korean Won (₩)" },
  { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar (HK$)" },
  { code: "TWD", symbol: "NT$", name: "New Taiwan Dollar (NT$)" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham (AED)" },
  { code: "SAR", symbol: "﷼", name: "Saudi Riyal (SAR)" },
];
