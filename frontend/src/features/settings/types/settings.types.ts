export interface Category {
  id: number;
  name: string;
  products_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface UnitOfMeasure {
  id: string;
  name: string;
  label: string;
  is_custom?: boolean;
}

export interface StoreSettings {
  store_name: string;
  owner_name: string;
  currency_symbol: string;
  default_markup_percent: string;
  default_reorder_level: string;
  enable_audio_beeper: boolean;
  enable_haptic_feedback: boolean;
  custom_units: UnitOfMeasure[];
}
