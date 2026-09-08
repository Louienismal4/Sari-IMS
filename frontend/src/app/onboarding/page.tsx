"use client";

import { useState, useEffect, useId, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Store,
  Database,
  KeyRound,
  Check,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  ExternalLink,
  Coins,
  Percent,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useInventory } from "@/context/InventoryContext";
import {
  fetchOnboardingStatus,
  testDbConnection,
  testGeminiApiKey,
  saveOnboardingSetup,
  OnboardingStatus,
} from "@/features/onboarding/api/onboardingService";
import { SUPPORTED_CURRENCIES } from "@/constants/defaults";

function OnboardingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditMode = searchParams.get("mode") === "edit";

  const { settings, markOnboarded, showToast, refreshInventory } =
    useInventory();

  const [initialLoading, setInitialLoading] = useState(true);
  const [statusData, setStatusData] = useState<OnboardingStatus | null>(null);

  // Store Profile State
  const [storeName, setStoreName] = useState("Sari-Sari Store");
  const [ownerName, setOwnerName] = useState("Store Owner");
  const [currencySymbol, setCurrencySymbol] = useState("₱");
  const [isCustomCurrency, setIsCustomCurrency] = useState(false);
  const [defaultMarkup, setDefaultMarkup] = useState("25");
  const [defaultReorder, setDefaultReorder] = useState("5");

  // Database State
  const [dbHost, setDbHost] = useState("mysql");
  const [dbPort, setDbPort] = useState("3306");
  const [dbDatabase, setDbDatabase] = useState("sari_inventory");
  const [dbUsername, setDbUsername] = useState("lwui");
  const [dbPassword, setDbPassword] = useState("Water123!");
  const [dbTesting, setDbTesting] = useState(false);
  const [dbTestResult, setDbTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Gemini State
  const [geminiKey, setGeminiKey] = useState("");
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [skipGemini, setSkipGemini] = useState(false);
  const [geminiTesting, setGeminiTesting] = useState(false);
  const [geminiTestResult, setGeminiTestResult] = useState<{
    valid: boolean;
    message: string;
  } | null>(null);

  // Submission State
  const [saving, setSaving] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Unique IDs for accessible inputs
  const storeNameId = useId();
  const ownerNameId = useId();
  const currencyId = useId();
  const markupId = useId();
  const reorderId = useId();
  const dbHostId = useId();
  const dbPortId = useId();
  const dbNameId = useId();
  const dbUserId = useId();
  const dbPassId = useId();
  const geminiKeyId = useId();

  useEffect(() => {
    async function loadStatus() {
      try {
        const res = await fetchOnboardingStatus();
        setStatusData(res);

        if (res.config) {
          if (res.config.app_name) setStoreName(res.config.app_name);
          if (res.config.db_host) setDbHost(res.config.db_host);
          if (res.config.db_port) setDbPort(String(res.config.db_port));
          if (res.config.db_database) setDbDatabase(res.config.db_database);
          if (res.config.db_username) setDbUsername(res.config.db_username);
        }

        if (settings) {
          if (settings.store_name) setStoreName(settings.store_name);
          if (settings.owner_name) setOwnerName(settings.owner_name);
          if (settings.currency_symbol) {
            setCurrencySymbol(settings.currency_symbol);
            setIsCustomCurrency(
              !SUPPORTED_CURRENCIES.some(
                (c) => c.symbol === settings.currency_symbol,
              ),
            );
          }
          if (settings.default_markup_percent)
            setDefaultMarkup(String(settings.default_markup_percent));
          if (settings.default_reorder_level)
            setDefaultReorder(String(settings.default_reorder_level));
        }

        if (res.is_onboarded && !isEditMode) {
          router.replace("/pos");
        }
      } catch (err) {
        console.error("Failed to load onboarding status:", err);
      } finally {
        setInitialLoading(false);
      }
    }

    loadStatus();
  }, [isEditMode, router, settings]);

  const handleTestDatabase = async () => {
    setDbTesting(true);
    setDbTestResult(null);
    try {
      const res = await testDbConnection({
        host: dbHost.trim(),
        port: parseInt(dbPort, 10) || 3306,
        database: dbDatabase.trim(),
        username: dbUsername.trim(),
        password: dbPassword,
      });
      setDbTestResult({ success: true, message: res.message });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Connection failed.";
      setDbTestResult({ success: false, message: msg });
    } finally {
      setDbTesting(false);
    }
  };

  const handleTestGeminiKey = async () => {
    if (!geminiKey.trim()) {
      setGeminiTestResult({
        valid: false,
        message: "Please enter an API key first.",
      });
      return;
    }
    setGeminiTesting(true);
    setGeminiTestResult(null);
    try {
      const res = await testGeminiApiKey(geminiKey.trim());
      setGeminiTestResult({ valid: true, message: res.message });
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "Failed to verify Gemini key.";
      setGeminiTestResult({ valid: false, message: msg });
    } finally {
      setGeminiTesting(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        store_name: storeName.trim(),
        owner_name: ownerName.trim(),
        currency_symbol: currencySymbol.trim() || "₱",
        default_markup_percent: parseFloat(defaultMarkup) || 25,
        default_reorder_level: parseInt(defaultReorder, 10) || 5,
        enable_audio_beeper: settings?.enable_audio_beeper ?? true,
        gemini_api_key: skipGemini ? "" : geminiKey.trim(),
        db_host: dbHost.trim(),
        db_port: parseInt(dbPort, 10) || 3306,
        db_database: dbDatabase.trim(),
        db_username: dbUsername.trim(),
        db_password: dbPassword,
      };

      const res = await saveOnboardingSetup(payload);
      markOnboarded(res.store_settings);
      setIsCompleted(true);
      showToast("Configuration saved successfully!", "success");

      await refreshInventory();

      setTimeout(() => {
        router.push("/pos");
      }, 1000);
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "Failed to save configuration";
      showToast(msg, "error");
      setSaving(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white text-zinc-900">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-900 mb-2" />
        <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
          Loading configuration...
        </p>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white text-zinc-900 p-4">
        <div className="w-10 h-10 rounded-full bg-zinc-950 text-white flex items-center justify-center mb-3">
          <Check className="w-5 h-5" />
        </div>
        <h1 className="text-sm font-bold tracking-tight text-zinc-950">
          Store Activated
        </h1>
        <p className="text-xs font-mono text-zinc-500 mt-1">
          .env updated. Launching system...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#fafafa] text-zinc-900 flex flex-col justify-between p-4 sm:p-8">
      {/* Minimal Monochrome Header */}
      <header className="max-w-2xl mx-auto w-full flex items-center justify-between pb-5 border-b border-zinc-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-950 text-white flex items-center justify-center font-bold text-xs shrink-0">
            <Store className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-zinc-950 tracking-tight">
                Sari-Sari Store IMS
              </h1>
              <span className="text-[10px] font-mono text-zinc-500 px-1.5 py-0.5 rounded border border-zinc-200 bg-white">
                {isEditMode ? "EDIT" : "SETUP"}
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              {isEditMode
                ? "Update centralized system credentials and environment configuration"
                : "Initial system onboarding. Configure your settings and launch"}
            </p>
          </div>
        </div>
      </header>

      {/* Single Unified Form */}
      <main className="max-w-2xl mx-auto w-full my-6 flex-1 flex flex-col justify-center">
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {/* 1. STORE PROFILE SECTION */}
          <Card className="shadow-xs border-zinc-200 bg-white rounded-xl">
            <CardHeader className="p-4 sm:p-5 pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-zinc-900" />
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                  Store Profile
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-zinc-500">
                Store identity and default margin rules
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label
                    htmlFor={storeNameId}
                    className="text-xs font-medium text-zinc-700"
                  >
                    Store Name
                  </label>
                  <Input
                    id={storeNameId}
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="e.g. Aling Nena's Store"
                    className="text-xs border-zinc-200 focus-visible:ring-zinc-950"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor={ownerNameId}
                    className="text-xs font-medium text-zinc-700"
                  >
                    Owner / Manager Name
                  </label>
                  <Input
                    id={ownerNameId}
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="e.g. Maria Santos"
                    className="text-xs border-zinc-200 focus-visible:ring-zinc-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="space-y-1">
                  <label
                    htmlFor={currencyId}
                    className="text-xs font-medium text-zinc-700 flex items-center justify-between"
                  >
                    <span>Currency</span>
                    <Coins className="w-3 h-3 text-zinc-400" />
                  </label>
                  <select
                    id={currencyId}
                    value={isCustomCurrency ? "CUSTOM" : currencySymbol}
                    onChange={(e) => {
                      if (e.target.value === "CUSTOM") {
                        setIsCustomCurrency(true);
                      } else {
                        setIsCustomCurrency(false);
                        setCurrencySymbol(e.target.value);
                      }
                    }}
                    className="flex h-8 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-900 shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 cursor-pointer"
                  >
                    {SUPPORTED_CURRENCIES.map((curr) => (
                      <option key={curr.code} value={curr.symbol}>
                        {curr.name}
                      </option>
                    ))}
                    <option value="CUSTOM">Custom symbol...</option>
                  </select>
                  {isCustomCurrency && (
                    <Input
                      type="text"
                      value={currencySymbol}
                      onChange={(e) => setCurrencySymbol(e.target.value)}
                      placeholder="e.g. BTC or kr"
                      className="mt-1 font-mono text-xs border-zinc-200 focus-visible:ring-zinc-950"
                      autoFocus
                    />
                  )}
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor={markupId}
                    className="text-xs font-medium text-zinc-700 flex items-center justify-between"
                  >
                    <span>Target Markup (%)</span>
                    <Percent className="w-3 h-3 text-zinc-400" />
                  </label>
                  <Input
                    id={markupId}
                    type="number"
                    step="0.5"
                    min="0"
                    value={defaultMarkup}
                    onChange={(e) => setDefaultMarkup(e.target.value)}
                    placeholder="25"
                    className="font-mono text-xs border-zinc-200 focus-visible:ring-zinc-950"
                  />
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor={reorderId}
                    className="text-xs font-medium text-zinc-700 flex items-center justify-between"
                  >
                    <span>Reorder Level</span>
                    <AlertTriangle className="w-3 h-3 text-zinc-400" />
                  </label>
                  <Input
                    id={reorderId}
                    type="number"
                    min="0"
                    value={defaultReorder}
                    onChange={(e) => setDefaultReorder(e.target.value)}
                    placeholder="5"
                    className="font-mono text-xs border-zinc-200 focus-visible:ring-zinc-950"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. DATABASE SECTION */}
          <Card className="shadow-xs border-zinc-200 bg-white rounded-xl">
            <CardHeader className="p-4 sm:p-5 pb-3 border-b border-zinc-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-zinc-900" />
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                    MySQL Database
                  </CardTitle>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestDatabase}
                  disabled={dbTesting}
                  className="h-7 px-2.5 text-[11px] border-zinc-300 text-zinc-800 bg-white hover:bg-zinc-50"
                >
                  {dbTesting ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      <span>Testing...</span>
                    </>
                  ) : (
                    <span>Test Connection</span>
                  )}
                </Button>
              </div>
              <CardDescription className="text-xs text-zinc-500">
                Default Docker MySQL credentials are pre-configured. Edit only
                if using external MySQL.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <label
                    htmlFor={dbHostId}
                    className="text-xs font-medium text-zinc-700"
                  >
                    Host
                  </label>
                  <Input
                    id={dbHostId}
                    type="text"
                    value={dbHost}
                    onChange={(e) => setDbHost(e.target.value)}
                    placeholder="mysql or 127.0.0.1"
                    className="font-mono text-xs border-zinc-200 focus-visible:ring-zinc-950"
                  />
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor={dbPortId}
                    className="text-xs font-medium text-zinc-700"
                  >
                    Port
                  </label>
                  <Input
                    id={dbPortId}
                    type="number"
                    value={dbPort}
                    onChange={(e) => setDbPort(e.target.value)}
                    placeholder="3306"
                    className="font-mono text-xs border-zinc-200 focus-visible:ring-zinc-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label
                    htmlFor={dbNameId}
                    className="text-xs font-medium text-zinc-700"
                  >
                    Database Name
                  </label>
                  <Input
                    id={dbNameId}
                    type="text"
                    value={dbDatabase}
                    onChange={(e) => setDbDatabase(e.target.value)}
                    placeholder="sari_inventory"
                    className="font-mono text-xs border-zinc-200 focus-visible:ring-zinc-950"
                  />
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor={dbUserId}
                    className="text-xs font-medium text-zinc-700"
                  >
                    Username
                  </label>
                  <Input
                    id={dbUserId}
                    type="text"
                    value={dbUsername}
                    onChange={(e) => setDbUsername(e.target.value)}
                    placeholder="lwui"
                    className="font-mono text-xs border-zinc-200 focus-visible:ring-zinc-950"
                  />
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor={dbPassId}
                    className="text-xs font-medium text-zinc-700"
                  >
                    Password
                  </label>
                  <Input
                    id={dbPassId}
                    type="password"
                    value={dbPassword}
                    onChange={(e) => setDbPassword(e.target.value)}
                    placeholder="••••••••"
                    className="font-mono text-xs border-zinc-200 focus-visible:ring-zinc-950"
                  />
                </div>
              </div>

              {dbTestResult && (
                <div
                  className={`text-xs p-2 rounded border flex items-center gap-1.5 font-mono ${
                    dbTestResult.success
                      ? "bg-zinc-100 border-zinc-300 text-zinc-900"
                      : "bg-zinc-100 border-zinc-400 text-zinc-900"
                  }`}
                >
                  {dbTestResult.success ? (
                    <Check className="w-3.5 h-3.5 text-zinc-900 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-zinc-900 shrink-0" />
                  )}
                  <span className="truncate">{dbTestResult.message}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 3. GOOGLE GEMINI AI SECTION */}
          <Card className="shadow-xs border-zinc-200 bg-white rounded-xl">
            <CardHeader className="p-4 sm:p-5 pb-3 border-b border-zinc-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-zinc-900" />
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                    Google Gemini AI Key
                  </CardTitle>
                </div>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-mono text-zinc-900 underline hover:text-zinc-600"
                >
                  <span>Get Free Key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <CardDescription className="text-xs text-zinc-500">
                Powers automated receipt scanning &amp; wholesale invoice
                extraction
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 space-y-3">
              <div className="space-y-1.5">
                <div className="relative flex items-center">
                  <Input
                    id={geminiKeyId}
                    type={showGeminiKey ? "text" : "password"}
                    value={geminiKey}
                    disabled={skipGemini}
                    onChange={(e) => {
                      setGeminiKey(e.target.value);
                      setGeminiTestResult(null);
                    }}
                    placeholder={
                      statusData?.masked_gemini_key
                        ? `Configured: ${statusData.masked_gemini_key}`
                        : "AIzaSy..."
                    }
                    className="font-mono text-xs pr-20 border-zinc-200 focus-visible:ring-zinc-950"
                  />
                  <div className="absolute right-1.5 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowGeminiKey(!showGeminiKey)}
                      disabled={skipGemini}
                      className="p-1 text-zinc-400 hover:text-zinc-700 rounded"
                      aria-label="Toggle password visibility"
                    >
                      {showGeminiKey ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleTestGeminiKey}
                      disabled={
                        geminiTesting || skipGemini || !geminiKey.trim()
                      }
                      className="h-7 px-2 text-[11px] border-zinc-300 text-zinc-800"
                    >
                      {geminiTesting ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        "Test"
                      )}
                    </Button>
                  </div>
                </div>

                {geminiTestResult && (
                  <div
                    className={`text-xs p-2 rounded border flex items-center gap-1.5 font-mono ${
                      geminiTestResult.valid
                        ? "bg-zinc-100 border-zinc-300 text-zinc-900"
                        : "bg-zinc-100 border-zinc-400 text-zinc-900"
                    }`}
                  >
                    {geminiTestResult.valid ? (
                      <Check className="w-3.5 h-3.5 text-zinc-900 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-zinc-900 shrink-0" />
                    )}
                    <span>{geminiTestResult.message}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-0.5">
                <input
                  type="checkbox"
                  id="skip-gemini"
                  checked={skipGemini}
                  onChange={(e) => {
                    setSkipGemini(e.target.checked);
                    if (e.target.checked) setGeminiTestResult(null);
                  }}
                  className="h-3.5 w-3.5 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 cursor-pointer"
                />
                <label
                  htmlFor="skip-gemini"
                  className="text-[11px] text-zinc-500 cursor-pointer"
                >
                  Skip AI key for now (can be configured later in Settings)
                </label>
              </div>
            </CardContent>
          </Card>

          {/* SUBMIT BUTTON */}
          <div className="pt-2">
            <Button
              type="submit"
              disabled={saving}
              className="w-full h-10 bg-zinc-950 hover:bg-black text-white font-medium text-xs rounded-xl shadow-xs transition-colors gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving configuration to .env...</span>
                </>
              ) : (
                <>
                  <span>Save Configuration &amp; Launch Store</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
            <p className="text-[11px] text-zinc-400 text-center mt-2 font-mono">
              Directly writes to root .env &bull; Sets APP_ONBOARDED=true
            </p>
          </div>
        </form>
      </main>

      {/* Minimal Footer */}
      <footer className="max-w-2xl mx-auto w-full text-center text-[11px] font-mono text-zinc-400 pt-6 border-t border-zinc-200">
        Sari-Sari Store IMS &bull; Centralized Environment System
      </footer>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#fafafa]">
          <Loader2 className="w-5 h-5 animate-spin text-zinc-900 mb-2" />
          <p className="text-xs font-mono text-zinc-400">Loading...</p>
        </div>
      }
    >
      <OnboardingForm />
    </Suspense>
  );
}
