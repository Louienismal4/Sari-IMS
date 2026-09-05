"use client";

import { useState, useId } from "react";
import { Scale, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UnitOfMeasure, StoreSettings } from "@/types/inventory";

interface UnitManagerCardProps {
  settings: StoreSettings;
  allUnits: UnitOfMeasure[];
  onUpdateSettings: (newSettings: StoreSettings) => void;
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
}

export function UnitManagerCard({
  settings,
  allUnits,
  onUpdateSettings,
  showToast,
}: UnitManagerCardProps) {
  const [customUnitSymbol, setCustomUnitSymbol] = useState("");
  const [customUnitLabel, setCustomUnitLabel] = useState("");

  const symbolInputId = useId();
  const labelInputId = useId();

  const handleAddCustomUnit = (e: React.FormEvent) => {
    e.preventDefault();
    const symbol = customUnitSymbol.trim().toLowerCase();
    const label = customUnitLabel.trim();

    if (!symbol || !label) return;

    // Check duplicate
    if (allUnits.some((u) => u.name.toLowerCase() === symbol)) {
      showToast(`Unit symbol "${symbol}" already exists.`, "warning");
      return;
    }

    const newUnit: UnitOfMeasure = {
      id: `custom_${Date.now()}`,
      name: symbol,
      label: `${label} (${symbol})`,
      is_custom: true,
    };

    const updatedCustomUnits = [...(settings.custom_units || []), newUnit];
    onUpdateSettings({
      ...settings,
      custom_units: updatedCustomUnits,
    });

    setCustomUnitSymbol("");
    setCustomUnitLabel("");
    showToast(`Added custom unit "${newUnit.label}"`, "success");
  };

  const handleRemoveCustomUnit = (unitId: string, unitName: string) => {
    const updatedCustomUnits = (settings.custom_units || []).filter((u) => u.id !== unitId);
    onUpdateSettings({
      ...settings,
      custom_units: updatedCustomUnits,
    });
    showToast(`Removed custom unit "${unitName}"`, "info");
  };

  const standardUnits = allUnits.filter((u) => !u.is_custom);
  const customUnits = allUnits.filter((u) => u.is_custom);

  return (
    <Card className="shadow-2xs border-zinc-200">
      <CardHeader className="p-4 sm:p-5 pb-3 border-b border-zinc-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold text-zinc-900">
              Units of Measure ({allUnits.length})
            </CardTitle>
            <CardDescription className="text-xs text-zinc-500">
              Manage retail packaging formats, packaging types, and custom measurements
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-5">
        {/* Add Custom Unit Form */}
        <form onSubmit={handleAddCustomUnit} className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 space-y-3">
          <span className="text-xs font-bold text-zinc-800 block">
            + Add Custom Unit of Measure
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <div className="sm:col-span-4 space-y-1">
              <label htmlFor={symbolInputId} className="text-[11px] font-semibold text-zinc-600">
                Unit Symbol / Code *
              </label>
              <Input
                id={symbolInputId}
                type="text"
                placeholder="e.g. tray, strip, gal"
                value={customUnitSymbol}
                onChange={(e) => setCustomUnitSymbol(e.target.value)}
                className="font-mono text-xs bg-white"
              />
            </div>
            <div className="sm:col-span-5 space-y-1">
              <label htmlFor={labelInputId} className="text-[11px] font-semibold text-zinc-600">
                Display Label *
              </label>
              <Input
                id={labelInputId}
                type="text"
                placeholder="e.g. Egg Tray (30 pcs)"
                value={customUnitLabel}
                onChange={(e) => setCustomUnitLabel(e.target.value)}
                className="text-xs bg-white"
              />
            </div>
            <div className="sm:col-span-3 flex items-end">
              <Button
                type="submit"
                disabled={!customUnitSymbol.trim() || !customUnitLabel.trim()}
                size="sm"
                className="w-full text-xs gap-1 min-h-[36px]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Unit</span>
              </Button>
            </div>
          </div>
        </form>

        {/* Custom Units List (if any) */}
        {customUnits.length > 0 && (
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono block">
              Custom Store Units ({customUnits.length})
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {customUnits.map((u) => (
                <div
                  key={u.id}
                  className="p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-200 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-zinc-900 block truncate">
                      {u.label}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-700 block">
                      code: {u.name}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveCustomUnit(u.id, u.label)}
                    className="h-7 w-7 text-zinc-400 hover:text-rose-600 shrink-0"
                    title="Remove custom unit"
                    aria-label={`Remove unit ${u.label}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Standard Units Roster */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono block">
            Built-in Standard Units ({standardUnits.length})
          </span>
          <div className="flex flex-wrap gap-1.5">
            {standardUnits.map((u) => (
              <Badge
                key={u.id}
                variant="outline"
                className="text-xs font-normal py-1 px-2.5 bg-zinc-50/70 border-zinc-200 text-zinc-700 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3 h-3 text-zinc-400" />
                <span>{u.label}</span>
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
