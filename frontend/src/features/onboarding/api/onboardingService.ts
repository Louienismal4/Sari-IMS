import { apiClient } from "@/lib/api-client";
import { StoreSettings } from "@/types/inventory";

export interface OnboardingConfig {
  app_name: string;
  db_host: string;
  db_port: number;
  db_database: string;
  db_username: string;
  frontend_port: number;
  backend_port: number;
}

export interface OnboardingStatus {
  is_onboarded: boolean;
  has_gemini_key: boolean;
  masked_gemini_key: string;
  db_connected: boolean;
  db_error: string | null;
  config: OnboardingConfig;
}

export interface TestDbParams {
  host: string;
  port: number;
  database: string;
  username: string;
  password?: string;
}

export interface TestDbResult {
  success: boolean;
  message: string;
}

export interface TestGeminiResult {
  valid: boolean;
  message: string;
  model?: string;
}

export interface OnboardingSetupPayload {
  store_name?: string;
  owner_name?: string;
  currency_symbol?: string;
  default_markup_percent?: number;
  default_reorder_level?: number;
  enable_audio_beeper?: boolean;
  gemini_api_key?: string;
  db_host?: string;
  db_port?: number;
  db_database?: string;
  db_username?: string;
  db_password?: string;
}

export interface OnboardingSetupResponse {
  success: boolean;
  message: string;
  store_settings: StoreSettings;
  is_onboarded: boolean;
}

export async function fetchOnboardingStatus(): Promise<OnboardingStatus> {
  return apiClient<OnboardingStatus>("/onboarding/status");
}

export async function testDbConnection(params: TestDbParams): Promise<TestDbResult> {
  return apiClient<TestDbResult>("/onboarding/test-db", {
    method: "POST",
    body: params,
  });
}

export async function testGeminiApiKey(apiKey: string): Promise<TestGeminiResult> {
  return apiClient<TestGeminiResult>("/onboarding/test-gemini", {
    method: "POST",
    body: { gemini_api_key: apiKey },
  });
}

export async function saveOnboardingSetup(
  payload: OnboardingSetupPayload
): Promise<OnboardingSetupResponse> {
  return apiClient<OnboardingSetupResponse>("/onboarding/setup", {
    method: "POST",
    body: payload,
  });
}
