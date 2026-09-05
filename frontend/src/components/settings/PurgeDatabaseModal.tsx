"use client";

import { useState, useId } from "react";
import { AlertTriangle, Trash2, Loader2, ShieldAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resetDatabaseApi } from "@/services/settingsService";

interface PurgeDatabaseModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (message: string) => void;
}

const CHALLENGE_PHRASE = "confirm to reset my database";

export function PurgeDatabaseModal({
  isOpen,
  onOpenChange,
  onSuccess,
}: PurgeDatabaseModalProps) {
  const [typedChallenge, setTypedChallenge] = useState("");
  const [mode, setMode] = useState<
    "clean_slate" | "demo_seed" | "keep_categories"
  >("clean_slate");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const challengeInputId = useId();
  const modeSelectId = useId();

  const isChallengeMatched =
    typedChallenge.trim().toLowerCase() === CHALLENGE_PHRASE.toLowerCase();

  const handlePurge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isChallengeMatched) return;

    setLoading(true);
    setError(null);

    try {
      const message = await resetDatabaseApi(typedChallenge.trim(), mode);
      // Clear local browser storage queues
      localStorage.removeItem("sari_scanned_receipt_queue");
      sessionStorage.removeItem("sari_receipt_preview");

      setTypedChallenge("");
      onOpenChange(false);
      onSuccess(message);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Database reset failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setTypedChallenge("");
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="space-y-2.5">
          <div className="w-11 h-11 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <DialogTitle className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <span>Purge &amp; Reset Store Database</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500 pt-1 leading-relaxed">
              This is a high-impact operation. Resetting the database will
              permanently delete all registered products, prices, barcodes, and
              audit history.
            </DialogDescription>
          </div>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handlePurge} className="space-y-4 pt-1">
          {/* Reset Mode Selection */}
          <div className="space-y-1.5">
            <label
              htmlFor={modeSelectId}
              className="text-xs font-semibold text-zinc-700"
            >
              Reset Options
            </label>
            <select
              id={modeSelectId}
              value={mode}
              onChange={(e) =>
                setMode(
                  e.target.value as
                    | "clean_slate"
                    | "demo_seed"
                    | "keep_categories",
                )
              }
              className="flex h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-900 shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950"
            >
              <option value="clean_slate">
                Clean Slate (Wipe all products &amp; init default categories)
              </option>
              <option value="keep_categories">
                Wipe Products Only (Preserve current custom categories)
              </option>
              <option value="demo_seed">
                Reset &amp; Load Demo Sari-Sari Store Products
              </option>
            </select>
          </div>

          {/* Security Challenge Box */}
          <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl space-y-2.5">
            <div className="text-xs font-semibold text-rose-900 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Security Challenge Verification</span>
            </div>
            <p className="text-[11px] text-rose-800 leading-normal font-medium">
              To verify that you intend to permanently delete this database,
              please type{" "}
              <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded text-rose-950 select-all">
                {CHALLENGE_PHRASE}
              </span>{" "}
              below:
            </p>

            <div className="space-y-1 pt-1">
              <label htmlFor={challengeInputId} className="sr-only">
                Type confirmation phrase
              </label>
              <Input
                id={challengeInputId}
                type="text"
                required
                autoComplete="off"
                placeholder={CHALLENGE_PHRASE}
                value={typedChallenge}
                onChange={(e) => setTypedChallenge(e.target.value)}
                className="bg-white font-mono text-xs border-rose-300 focus:border-rose-600 focus:ring-rose-500"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="secondary"
              disabled={loading}
              onClick={handleClose}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={!isChallengeMatched || loading}
              className="gap-1.5 text-xs font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Purging Database...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Purge Database</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
