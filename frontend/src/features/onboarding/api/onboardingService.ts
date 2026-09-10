import { apiClient } from "@/lib/api-client";

export interface SystemDiagnostic {
  connected: boolean;
  driver?: string;
  database?: string;
  message: string;
}

export interface InstallationStatus {
  installed: boolean;
  status: "pending" | "installing" | "completed" | "failed";
  version: string;
  database: SystemDiagnostic;
  redis: {
    connected: boolean;
    message?: string;
  };
  storage_writable: boolean;
  has_admin: boolean;
  store: {
    id: number;
    name: string;
    owner_name?: string;
    currency: string;
    currency_symbol: string;
    timezone: string;
    address?: string;
    target_markup_percentage: number;
    default_reorder_level: number;
  } | null;
  has_gemini_key: boolean;
  masked_gemini_key: string | null;
}

export interface SetupPayload {
  admin: {
    name: string;
    email: string;
    password: string;
  };
  store: {
    name: string;
    owner_name?: string;
    address?: string;
    timezone?: string;
    currency?: string;
    currency_symbol?: string;
    target_markup_percentage?: number;
    default_reorder_level?: number;
  };
  integrations?: {
    gemini_api_key?: string;
    gemini_model?: string;
  };
}

export interface SetupResponse {
  success: boolean;
  message: string;
  version?: string;
  installed_at?: string;
}

export async function fetchInstallationStatus(): Promise<InstallationStatus> {
  return apiClient<InstallationStatus>("/installation/status");
}

export async function testDatabase(): Promise<SystemDiagnostic> {
  return apiClient<SystemDiagnostic>("/setup/test-db", {
    method: "POST",
  });
}

export async function testRedis(): Promise<{ connected: boolean; message: string }> {
  return apiClient<{ connected: boolean; message: string }>("/setup/test-redis", {
    method: "POST",
  });
}

export async function testGeminiApiKey(apiKey: string): Promise<{ success: boolean; message: string }> {
  return apiClient<{ success: boolean; message: string }>("/setup/test-integration", {
    method: "POST",
    body: { provider: "gemini", api_key: apiKey },
  });
}

export async function completeSetup(payload: SetupPayload): Promise<SetupResponse> {
  return apiClient<SetupResponse>("/setup/complete", {
    method: "POST",
    body: payload,
  });
}

export type OnboardingStatus = {
  is_onboarded: boolean;
  has_gemini_key: boolean;
  masked_gemini_key: string;
  db_connected: boolean;
  db_error: string | null;
  config: {
    app_name: string;
    db_host: string;
    db_port: number;
    db_database: string;
    db_username: string;
    frontend_port: number;
    backend_port: number;
  };
};

export interface LegacyOnboardingPayload {
  owner_name?: string;
  store_name?: string;
  currency_symbol?: string;
  default_markup_percent?: number;
  default_reorder_level?: number;
  gemini_api_key?: string;
  [key: string]: unknown;
}

export interface LegacyOnboardingResponse {
  success: boolean;
  message: string;
  store_settings: LegacyOnboardingPayload;
  is_onboarded: boolean;
}

// Backward compatibility aliases
export async function testDbConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const res = await testDatabase();
    return { success: res.connected, message: res.message };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database connection error";
    return { success: false, message };
  }
}

export async function saveOnboardingSetup(payload: LegacyOnboardingPayload): Promise<LegacyOnboardingResponse> {
  const setupPayload: SetupPayload = {
    admin: {
      name: payload.owner_name || "Admin",
      email: "admin@sari.local",
      password: "password123",
    },
    store: {
      name: payload.store_name || "Sari-Sari Store",
      owner_name: payload.owner_name,
      currency_symbol: payload.currency_symbol || "₱",
      target_markup_percentage: payload.default_markup_percent ?? 20,
      default_reorder_level: payload.default_reorder_level ?? 5,
    },
    integrations: payload.gemini_api_key
      ? { gemini_api_key: payload.gemini_api_key }
      : undefined,
  };

  const res = await completeSetup(setupPayload);
  return {
    success: res.success,
    message: res.message,
    store_settings: payload,
    is_onboarded: true,
  };
}

export const fetchOnboardingStatus = async (): Promise<OnboardingStatus> => {
  const s = await fetchInstallationStatus();
  return {
    is_onboarded: s.installed,
    has_gemini_key: s.has_gemini_key,
    masked_gemini_key: s.masked_gemini_key || "",
    db_connected: s.database.connected,
    db_error: s.database.connected ? null : s.database.message,
    config: {
      app_name: s.store?.name || "Sari-Sari Store",
      db_host: "postgres",
      db_port: 5432,
      db_database: "sari_inventory",
      db_username: "sari_user",
      frontend_port: 3001,
      backend_port: 8000,
    },
  };
};

