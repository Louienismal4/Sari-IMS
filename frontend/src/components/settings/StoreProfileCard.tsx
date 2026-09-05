"use client";

import { useId, useState } from "react";
import { Store, Percent, AlertTriangle, Volume2, Save, Coins } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StoreSettings } from "@/types/inventory";

interface StoreProfileCardProps {
  settings: StoreSettings;
  onSave: (newSettings: StoreSettings) => void;
}

export function StoreProfileCard({ settings, onSave }: StoreProfileCardProps) {
  const [formState, setFormState] = useState<StoreSettings>(settings);
  const [saved, setSaved] = useState(false);

  const storeNameId = useId();
  const ownerNameId = useId();
  const currencyId = useId();
  const markupId = useId();
  const reorderId = useId();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formState);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <Card className="shadow-2xs border-zinc-200">
      <CardHeader className="p-4 sm:p-5 pb-3 border-b border-zinc-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center">
            <Store className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold text-zinc-900">
              Store Profile &amp; Defaults
            </CardTitle>
            <CardDescription className="text-xs text-zinc-500">
              Personalize store identity, default target markup %, and reorder alert threshold
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 pt-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Store Name */}
            <div className="space-y-1">
              <label htmlFor={storeNameId} className="text-xs font-semibold text-zinc-700">
                Store Name
              </label>
              <Input
                id={storeNameId}
                type="text"
                value={formState.store_name}
                onChange={(e) => setFormState({ ...formState, store_name: e.target.value })}
                placeholder="e.g. Aling Nena's Sari-Sari Store"
                className="text-xs"
              />
            </div>

            {/* Owner Name */}
            <div className="space-y-1">
              <label htmlFor={ownerNameId} className="text-xs font-semibold text-zinc-700">
                Owner / Manager Name
              </label>
              <Input
                id={ownerNameId}
                type="text"
                value={formState.owner_name}
                onChange={(e) => setFormState({ ...formState, owner_name: e.target.value })}
                placeholder="e.g. Maria Santos"
                className="text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Currency Symbol */}
            <div className="space-y-1">
              <label htmlFor={currencyId} className="text-xs font-semibold text-zinc-700 flex items-center justify-between">
                <span>Currency Symbol</span>
                <Coins className="w-3 h-3 text-zinc-400" />
              </label>
              <Input
                id={currencyId}
                type="text"
                value={formState.currency_symbol}
                onChange={(e) => setFormState({ ...formState, currency_symbol: e.target.value })}
                placeholder="₱"
                className="font-mono text-xs"
              />
            </div>

            {/* Default Target Markup */}
            <div className="space-y-1">
              <label htmlFor={markupId} className="text-xs font-semibold text-zinc-700 flex items-center justify-between">
                <span>Default Markup (%)</span>
                <Percent className="w-3 h-3 text-zinc-400" />
              </label>
              <Input
                id={markupId}
                type="number"
                step="0.5"
                min="0"
                value={formState.default_markup_percent}
                onChange={(e) => setFormState({ ...formState, default_markup_percent: e.target.value })}
                placeholder="25"
                className="font-mono text-xs text-emerald-700 font-semibold"
              />
            </div>

            {/* Default Reorder Alert Threshold */}
            <div className="space-y-1">
              <label htmlFor={reorderId} className="text-xs font-semibold text-zinc-700 flex items-center justify-between">
                <span>Default Reorder Level</span>
                <AlertTriangle className="w-3 h-3 text-zinc-400" />
              </label>
              <Input
                id={reorderId}
                type="number"
                min="0"
                value={formState.default_reorder_level}
                onChange={(e) => setFormState({ ...formState, default_reorder_level: e.target.value })}
                placeholder="5"
                className="font-mono text-xs"
              />
            </div>
          </div>

          {/* Scanner & Audio Preferences */}
          <div className="pt-2 border-t border-zinc-100 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono block">
              Scanner &amp; POS Feedback
            </span>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-200">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-zinc-200 text-zinc-800 flex items-center justify-center shrink-0">
                  <Volume2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-zinc-800 block">
                    Audio Beep on Barcode Scan
                  </span>
                  <span className="text-[11px] text-zinc-500 block">
                    Play a confirmation audio chime when barcode camera or USB scanner decodes an item
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={formState.enable_audio_beeper}
                onChange={(e) => setFormState({ ...formState, enable_audio_beeper: e.target.checked })}
                className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-950 shrink-0 cursor-pointer"
                aria-label="Toggle audio beeper"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-2">
            <Button type="submit" size="sm" className="gap-1.5 text-xs min-h-[38px]">
              <Save className="w-3.5 h-3.5" />
              <span>{saved ? "Preferences Saved!" : "Save Store Settings"}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
