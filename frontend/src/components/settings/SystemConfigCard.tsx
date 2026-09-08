"use client";

import { useState, useEffect, useId } from "react";
import { useRouter } from "next/navigation";
import {
  Server,
  Sparkles,
  Database,
  Loader2,
  ExternalLink,
  Save,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  RotateCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  fetchOnboardingStatus,
  testGeminiApiKey,
  saveOnboardingSetup,
  OnboardingStatus,
} from "@/features/onboarding/api/onboardingService";

interface SystemConfigCardProps {
  showToast: (message: string, type?: "success" | "error" | "info" | "warning") => void;
}

export function SystemConfigCard({ showToast }: SystemConfigCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<OnboardingStatus | null>(null);

  // Gemini editing state
  const [geminiKeyInput, setGeminiKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{ valid: boolean; message: string } | null>(null);
  const [savingKey, setSavingKey] = useState(false);

  const apiKeyInputId = useId();

  const loadStatus = async () => {
    setLoading(true);
    try {
      const res = await fetchOnboardingStatus();
      setStatus(res);
    } catch (e) {
      console.error("Failed to load system config status:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleTestKey = async () => {
    if (!geminiKeyInput.trim()) {
      setTestResult({ valid: false, message: "Please enter an API key to test." });
      return;
    }
    setTestingKey(true);
    setTestResult(null);
    try {
      const res = await testGeminiApiKey(geminiKeyInput.trim());
      setTestResult({ valid: true, message: res.message });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to test Gemini key.";
      setTestResult({ valid: false, message: msg });
    } finally {
      setTestingKey(false);
    }
  };

  const handleSaveGeminiKey = async () => {
    if (!geminiKeyInput.trim()) {
      showToast("Please enter an API key first.", "warning");
      return;
    }
    setSavingKey(true);
    try {
      await saveOnboardingSetup({
        gemini_api_key: geminiKeyInput.trim(),
      });
      showToast("Google Gemini API key updated and saved to centralized .env!", "success");
      setGeminiKeyInput("");
      setTestResult(null);
      await loadStatus();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to update Gemini key";
      showToast(msg, "error");
    } finally {
      setSavingKey(false);
    }
  };

  if (loading) {
    return (
      <Card className="shadow-2xs border-zinc-200">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-zinc-900" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-2xs border-zinc-200 bg-white">
      <CardHeader className="p-4 sm:p-5 pb-3 border-b border-zinc-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-950 text-white flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-zinc-900 tracking-tight">
                System &amp; Environment Configuration
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500">
                Single centralized .env parameters, database connection, and Google Gemini AI key
              </CardDescription>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/onboarding?mode=edit")}
            className="text-xs h-8 gap-1.5 border-zinc-300 text-zinc-800 hover:bg-zinc-50 hidden sm:flex"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Re-run Setup</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 pt-4 space-y-4">
        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Database Info */}
          <div className="p-3 bg-zinc-50/70 rounded-lg border border-zinc-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-900 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-zinc-800" />
                Database Connection
              </span>
              <Badge
                variant="outline"
                className="text-[10px] font-mono bg-white border-zinc-200 text-zinc-800"
              >
                {status?.db_connected ? "CONNECTED" : "OFFLINE"}
              </Badge>
            </div>
            <div className="text-[11px] font-mono text-zinc-600 space-y-0.5">
              <p>Host: {status?.config.db_host}:{status?.config.db_port}</p>
              <p>Database: {status?.config.db_database}</p>
              <p>User: {status?.config.db_username}</p>
            </div>
          </div>

          {/* AI Info */}
          <div className="p-3 bg-zinc-50/70 rounded-lg border border-zinc-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-zinc-800" />
                Google Gemini AI
              </span>
              <Badge
                variant="outline"
                className="text-[10px] font-mono bg-white border-zinc-200 text-zinc-800"
              >
                {status?.has_gemini_key ? "ACTIVE" : "UNCONFIGURED"}
              </Badge>
            </div>
            <div className="text-[11px] text-zinc-600 space-y-0.5">
              <p className="font-mono">
                Key: {status?.masked_gemini_key || "None configured"}
              </p>
              <p>Feature: Receipt OCR Scanner &amp; Wholesaler Restocking</p>
              <p className="font-mono text-zinc-400">Model: gemini-2.5-flash-lite</p>
            </div>
          </div>
        </div>

        {/* Update Gemini API Key form */}
        <div className="p-3.5 bg-zinc-50 rounded-lg border border-zinc-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-zinc-800" />
              Update Gemini API Key
            </span>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-mono text-zinc-900 underline hover:text-zinc-600 inline-flex items-center gap-1"
            >
              <span>Get API Key</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="space-y-2">
            <div className="relative flex items-center">
              <Input
                id={apiKeyInputId}
                type={showKey ? "text" : "password"}
                value={geminiKeyInput}
                onChange={(e) => {
                  setGeminiKeyInput(e.target.value);
                  setTestResult(null);
                }}
                placeholder={status?.has_gemini_key ? "Enter new key to replace existing..." : "AIzaSy..."}
                className="font-mono text-xs pr-20 bg-white border-zinc-200 focus-visible:ring-zinc-950"
              />
              <div className="absolute right-1.5 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="p-1 text-zinc-400 hover:text-zinc-700 rounded"
                  aria-label="Toggle password visibility"
                >
                  {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleTestKey}
                  disabled={testingKey || !geminiKeyInput.trim()}
                  className="h-7 px-2 text-[11px] bg-white border-zinc-300 text-zinc-800"
                >
                  {testingKey ? <Loader2 className="w-3 h-3 animate-spin" /> : "Test"}
                </Button>
              </div>
            </div>

            {testResult && (
              <div
                className={`text-xs p-2 rounded border flex items-center gap-1.5 font-mono ${
                  testResult.valid
                    ? "bg-zinc-100 border-zinc-300 text-zinc-900"
                    : "bg-zinc-100 border-zinc-400 text-zinc-900"
                }`}
              >
                {testResult.valid ? (
                  <Check className="w-3.5 h-3.5 text-zinc-900 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-zinc-900 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-1">
            <span className="text-[11px] font-mono text-zinc-400">
              Directly writes to root .env
            </span>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveGeminiKey}
              disabled={savingKey || !geminiKeyInput.trim()}
              className="gap-1.5 text-xs h-8 bg-zinc-950 hover:bg-black text-white font-medium rounded-lg"
            >
              {savingKey ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save to .env</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
