"use client";

import { useState, useEffect, useId, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  UserCheck,
  Store,
  Sparkles,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  ExternalLink,
  ShieldCheck,
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
  fetchInstallationStatus,
  testGeminiApiKey,
  completeSetup,
} from "@/features/onboarding/api/onboardingService";
import { SUPPORTED_CURRENCIES } from "@/constants/defaults";

function SetupForm() {
  const router = useRouter();
  const { markOnboarded, showToast, refreshInventory } = useInventory();

  const [initialLoading, setInitialLoading] = useState(true);

  // Administrator Account
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminConfirmPassword, setAdminConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Store Configuration
  const [storeName, setStoreName] = useState("Sari-Sari Store");
  const [ownerName, setOwnerName] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState("PHP");
  const [customCurrencySymbol, setCustomCurrencySymbol] = useState("₱");
  const [targetMarkup, setTargetMarkup] = useState(20);
  const [reorderLevel, setReorderLevel] = useState(5);

  // Google Gemini AI
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [testingGemini, setTestingGemini] = useState(false);
  const [geminiTestResult, setGeminiTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Unique accessible IDs
  const adminNameId = useId();
  const adminEmailId = useId();
  const adminPasswordId = useId();
  const adminConfirmPasswordId = useId();
  const storeNameId = useId();
  const ownerNameId = useId();
  const addressId = useId();
  const markupId = useId();
  const reorderId = useId();
  const geminiId = useId();

  // Load current status
  useEffect(() => {
    let ignore = false;
    async function loadStatus() {
      try {
        const data = await fetchInstallationStatus();
        if (!ignore) {
          // If already completed, redirect to home
          if (data.installed) {
            router.replace("/");
            return;
          }

          if (data.store) {
            if (data.store.name) setStoreName(data.store.name);
            if (data.store.owner_name) setOwnerName(data.store.owner_name);
            if (data.store.address) setStoreAddress(data.store.address);
            if (data.store.currency)
              setSelectedCurrencyCode(data.store.currency);
            if (data.store.currency_symbol)
              setCustomCurrencySymbol(data.store.currency_symbol);
            if (data.store.target_markup_percentage)
              setTargetMarkup(data.store.target_markup_percentage);
            if (data.store.default_reorder_level)
              setReorderLevel(data.store.default_reorder_level);
          }
        }
      } catch (err) {
        console.error("Failed to load installation status:", err);
      } finally {
        if (!ignore) setInitialLoading(false);
      }
    }

    loadStatus();
    return () => {
      ignore = true;
    };
  }, [router]);

  const handleTestGemini = async () => {
    if (!geminiApiKey.trim()) {
      showToast("Please enter an API key to test", "warning");
      return;
    }
    setTestingGemini(true);
    setGeminiTestResult(null);
    try {
      const res = await testGeminiApiKey(geminiApiKey.trim());
      setGeminiTestResult(res);
      if (res.success) {
        showToast("Gemini API key is valid", "success");
      } else {
        showToast(res.message, "error");
      }
    } catch {
      setGeminiTestResult({
        success: false,
        message: "Failed to connect to Gemini API endpoint",
      });
      showToast("Verification failed", "error");
    } finally {
      setTestingGemini(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Form validations
    if (!adminName.trim()) {
      setErrorMessage("Administrator full name is required.");
      return;
    }
    if (!adminEmail.trim() || !adminEmail.includes("@")) {
      setErrorMessage("A valid administrator email address is required.");
      return;
    }
    if (adminPassword.length < 6) {
      setErrorMessage("Administrator password must be at least 6 characters.");
      return;
    }
    if (adminPassword !== adminConfirmPassword) {
      setErrorMessage("Administrator passwords do not match.");
      return;
    }
    if (!storeName.trim()) {
      setErrorMessage("Store name is required.");
      return;
    }

    setSubmitting(true);

    const activeCurrency =
      selectedCurrencyCode === "CUSTOM"
        ? customCurrencySymbol
        : SUPPORTED_CURRENCIES.find((c) => c.code === selectedCurrencyCode)
            ?.symbol || "₱";

    try {
      const payload = {
        admin: {
          name: adminName.trim(),
          email: adminEmail.trim(),
          password: adminPassword,
        },
        store: {
          name: storeName.trim(),
          owner_name: ownerName.trim() || adminName.trim(),
          address: storeAddress.trim() || undefined,
          timezone: "Asia/Manila",
          currency: selectedCurrencyCode,
          currency_symbol: activeCurrency,
          target_markup_percentage: targetMarkup,
          default_reorder_level: reorderLevel,
        },
        integrations: geminiApiKey.trim()
          ? {
              gemini_api_key: geminiApiKey.trim(),
              gemini_model: "gemini-2.5-flash-lite",
            }
          : undefined,
      };

      const result = await completeSetup(payload);
      showToast(result.message || "Setup completed successfully", "success");

      markOnboarded({
        store_name: storeName.trim(),
        owner_name: ownerName.trim() || adminName.trim(),
        currency_symbol: activeCurrency,
        default_markup_percent: String(targetMarkup),
        default_reorder_level: String(reorderLevel),
        enable_audio_beeper: true,
        enable_haptic_feedback: false,
        custom_units: [],
      });

      await refreshInventory();
      router.replace("/");
    } catch (err: unknown) {
      console.error("Setup failed:", err);
      const message =
        err instanceof Error
          ? err.message
          : "Failed to finalize installation. Please check server logs.";
      setErrorMessage(message);
      showToast("Setup encountered an error", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-800" />
          <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
            Checking system state...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Minimalist Monochrome Header */}
        <div className="space-y-2 border-b border-zinc-200 pb-6">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
            Store Setup & Initialization
          </h1>
          <p className="text-xs leading-relaxed text-zinc-500">
            Configure your store administrator, business settings, and external
            integrations in a single step. All settings are committed to
            PostgreSQL.
          </p>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-zinc-100 border border-zinc-300 text-zinc-900 text-xs font-medium">
            <AlertCircle className="w-4 h-4 text-zinc-900 flex-shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{errorMessage}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECTION 1: Administrator Account */}
          <Card className="border-zinc-200 bg-white shadow-none rounded-xl">
            <CardHeader className="border-b border-zinc-100 pb-3">
              <CardTitle className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-zinc-700" /> 1. Administrator
                Account
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500">
                Primary credentials for managing your inventory, audits, and
                settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label
                    htmlFor={adminNameId}
                    className="text-xs font-medium text-zinc-700"
                  >
                    Full Name <span className="text-zinc-400">*</span>
                  </label>
                  <Input
                    id={adminNameId}
                    type="text"
                    required
                    placeholder="e.g. Maria Santos"
                    value={adminName}
                    onChange={(e) => {
                      setAdminName(e.target.value);
                      if (!ownerName) setOwnerName(e.target.value);
                    }}
                    className="h-9 text-xs border-zinc-300 rounded-lg focus:border-zinc-900 focus:ring-zinc-900"
                  />
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor={adminEmailId}
                    className="text-xs font-medium text-zinc-700"
                  >
                    Email Address <span className="text-zinc-400">*</span>
                  </label>
                  <Input
                    id={adminEmailId}
                    type="email"
                    required
                    placeholder="admin@example.com"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="h-9 text-xs border-zinc-300 rounded-lg focus:border-zinc-900 focus:ring-zinc-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label
                    htmlFor={adminPasswordId}
                    className="text-xs font-medium text-zinc-700"
                  >
                    Password <span className="text-zinc-400">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      id={adminPasswordId}
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Min. 6 characters"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="h-9 text-xs border-zinc-300 rounded-lg pr-9 focus:border-zinc-900 focus:ring-zinc-900"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                    >
                      {showPassword ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor={adminConfirmPasswordId}
                    className="text-xs font-medium text-zinc-700"
                  >
                    Confirm Password <span className="text-zinc-400">*</span>
                  </label>
                  <Input
                    id={adminConfirmPasswordId}
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Repeat password"
                    value={adminConfirmPassword}
                    onChange={(e) => setAdminConfirmPassword(e.target.value)}
                    className="h-9 text-xs border-zinc-300 rounded-lg focus:border-zinc-900 focus:ring-zinc-900"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SECTION 2: Store Configuration */}
          <Card className="border-zinc-200 bg-white shadow-none rounded-xl">
            <CardHeader className="border-b border-zinc-100 pb-3">
              <CardTitle className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                <Store className="w-4 h-4 text-zinc-700" /> 2. Store Profile
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500">
                Business details printed on POS receipts and reports.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label
                    htmlFor={storeNameId}
                    className="text-xs font-medium text-zinc-700"
                  >
                    Store Name <span className="text-zinc-400">*</span>
                  </label>
                  <Input
                    id={storeNameId}
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="e.g. Aling Nena's Sari-Sari Store"
                    className="h-9 text-xs border-zinc-300 rounded-lg focus:border-zinc-900 focus:ring-zinc-900"
                  />
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor={ownerNameId}
                    className="text-xs font-medium text-zinc-700"
                  >
                    Owner Name
                  </label>
                  <Input
                    id={ownerNameId}
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Store owner"
                    className="h-9 text-xs border-zinc-300 rounded-lg focus:border-zinc-900 focus:ring-zinc-900"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor={addressId}
                  className="text-xs font-medium text-zinc-700"
                >
                  Store Address
                </label>
                <Input
                  id={addressId}
                  type="text"
                  value={storeAddress}
                  onChange={(e) => setStoreAddress(e.target.value)}
                  placeholder="e.g. 123 Rizal Street, Barangay 4"
                  className="h-9 text-xs border-zinc-300 rounded-lg focus:border-zinc-900 focus:ring-zinc-900"
                />
              </div>

              {/* Currency Selector */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700">
                  Currency Format
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select
                    className="sm:col-span-2 flex h-9 w-full rounded-lg border border-zinc-300 bg-white px-3 py-1 text-xs text-zinc-900 shadow-none focus:outline-none focus:border-zinc-900 font-sans"
                    value={selectedCurrencyCode}
                    onChange={(e) => {
                      const code = e.target.value;
                      setSelectedCurrencyCode(code);
                      const matched = SUPPORTED_CURRENCIES.find(
                        (c) => c.code === code,
                      );
                      if (matched) {
                        setCustomCurrencySymbol(matched.symbol);
                      }
                    }}
                  >
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.symbol} &mdash; {c.name} ({c.code})
                      </option>
                    ))}
                    <option value="CUSTOM">Custom Symbol...</option>
                  </select>

                  <Input
                    type="text"
                    value={customCurrencySymbol}
                    onChange={(e) => setCustomCurrencySymbol(e.target.value)}
                    disabled={selectedCurrencyCode !== "CUSTOM"}
                    placeholder="Symbol"
                    className="h-9 font-mono text-center text-xs font-bold border-zinc-300"
                  />
                </div>
              </div>

              {/* Markup & Reorder Thresholds */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label
                    htmlFor={markupId}
                    className="text-xs font-medium text-zinc-700"
                  >
                    Default Profit Markup (%)
                  </label>
                  <Input
                    id={markupId}
                    type="number"
                    min="0"
                    max="1000"
                    value={targetMarkup}
                    onChange={(e) => setTargetMarkup(Number(e.target.value))}
                    className="h-9 text-xs font-mono border-zinc-300 rounded-lg focus:border-zinc-900 focus:ring-zinc-900"
                  />
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor={reorderId}
                    className="text-xs font-medium text-zinc-700"
                  >
                    Low Stock Reorder Alert Level
                  </label>
                  <Input
                    id={reorderId}
                    type="number"
                    min="1"
                    value={reorderLevel}
                    onChange={(e) => setReorderLevel(Number(e.target.value))}
                    className="h-9 text-xs font-mono border-zinc-300 rounded-lg focus:border-zinc-900 focus:ring-zinc-900"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SECTION 3: AI & OCR Integration */}
          <Card className="border-zinc-200 bg-white shadow-none rounded-xl">
            <CardHeader className="border-b border-zinc-100 pb-3">
              <CardTitle className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-zinc-700" /> 3. Google Gemini
                AI OCR (Optional)
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500">
                Automates receipt scanning and line-item extraction. Stored
                encrypted (AES-256) in PostgreSQL.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor={geminiId}
                    className="text-xs font-medium text-zinc-700"
                  >
                    Gemini API Key
                  </label>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-zinc-600 hover:text-zinc-900 flex items-center gap-1 font-mono underline underline-offset-2"
                  >
                    Get free API key <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id={geminiId}
                      type={showGeminiKey ? "text" : "password"}
                      placeholder="AIzaSy... (Leave empty to skip)"
                      value={geminiApiKey}
                      onChange={(e) => {
                        setGeminiApiKey(e.target.value);
                        setGeminiTestResult(null);
                      }}
                      className="h-9 text-xs font-mono border-zinc-300 rounded-lg pr-9 focus:border-zinc-900 focus:ring-zinc-900"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGeminiKey(!showGeminiKey)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                    >
                      {showGeminiKey ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleTestGemini}
                    disabled={testingGemini || !geminiApiKey.trim()}
                    className="h-9 text-xs font-mono border-zinc-300 text-zinc-800 hover:bg-zinc-100"
                  >
                    {testingGemini && (
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    )}
                    Test
                  </Button>
                </div>
              </div>

              {/* Gemini Test Feedback */}
              {geminiTestResult && (
                <div className="p-2.5 rounded-lg text-xs font-mono flex items-center gap-2 border border-zinc-200 bg-zinc-50 text-zinc-800">
                  <span className="w-2 h-2 rounded-full bg-zinc-800 flex-shrink-0" />
                  <span>{geminiTestResult.message}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Security & Lock Note */}
          <div className="p-3.5 rounded-lg border border-zinc-200 bg-zinc-100/60 text-xs text-zinc-600 space-y-1">
            <p className="font-semibold text-zinc-900 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-800" /> Installation
              Locking
            </p>
            <p className="leading-relaxed text-[11px]">
              Upon saving, this installation is finalized in PostgreSQL. All
              setup endpoints will be permanently locked (HTTP 403) to prevent
              unauthorized reconfiguration.
            </p>
          </div>

          {/* Unified Action Footer */}
          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-10 text-xs font-semibold uppercase tracking-wider bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg shadow-sm gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving
                Configuration & Launching...
              </>
            ) : (
              <>Save Configuration & Launch Store</>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function SetupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-zinc-50">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-800" />
        </div>
      }
    >
      <SetupForm />
    </Suspense>
  );
}
