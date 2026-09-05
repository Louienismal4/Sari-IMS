"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { ClipboardCheck, History, RefreshCw, Send, CheckCircle2, TrendingUp, Calendar, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AppHeader } from "@/components/layout/AppHeader";
import { AuditSheetTable } from "@/components/audit/AuditSheetTable";
import { AuditSummaryReportModal } from "@/components/audit/AuditSummaryReportModal";
import { useInventory } from "@/context/InventoryContext";
import { fetchAuditSheet, submitStockAudit, fetchAuditHistory } from "@/features/audit/api/auditService";
import { AuditSheetResponse, StockAudit } from "@/types/inventory";

export default function WeeklyStockAuditPage() {
  const { setSidebarOpen, refreshInventory, showToast } = useInventory();

  // Tab view: "sheet" (Live Count) vs "history" (Past Audits)
  const [activeTab, setActiveTab] = useState<"sheet" | "history">("sheet");

  // Audit Sheet State
  const [sheetData, setSheetData] = useState<AuditSheetResponse | null>(null);
  const [loadingSheet, setLoadingSheet] = useState(true);
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [discrepancies, setDiscrepancies] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [auditNotes, setAuditNotes] = useState("");

  // Post-audit modal & past audits history
  const [completedAudit, setCompletedAudit] = useState<StockAudit | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [pastAudits, setPastAudits] = useState<StockAudit[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Load audit sheet data
  const loadSheet = useCallback(async () => {
    setLoadingSheet(true);
    try {
      const data = await fetchAuditSheet();
      setSheetData(data);

      // Initialize counts to suggested/current physical count
      const initialCounts: Record<number, number> = {};
      data.items.forEach((item) => {
        initialCounts[item.product_id] = item.suggested_physical_count;
      });
      setCounts(initialCounts);
    } catch (err: unknown) {
      console.error("Failed to load audit sheet:", err);
      showToast("Failed to load audit sheet", "error");
    } finally {
      setLoadingSheet(false);
    }
  }, [showToast]);

  // Load past audits history
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const data = await fetchAuditHistory();
      setPastAudits(data);
    } catch (err: unknown) {
      console.error("Failed to load past audits:", err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadSheet();
    loadHistory();
  }, [loadSheet, loadHistory]);

  // Update physical count handler
  const handleCountChange = useCallback((productId: number, count: number) => {
    setCounts((prev) => ({ ...prev, [productId]: Math.max(0, count) }));
  }, []);

  // Update discrepancy notes handler
  const handleDiscrepancyChange = useCallback((productId: number, note: string) => {
    setDiscrepancies((prev) => ({ ...prev, [productId]: note }));
  }, []);

  // Pre-fill all expected button
  const handleSetAllToExpected = useCallback(() => {
    if (!sheetData) return;
    const newCounts: Record<number, number> = {};
    sheetData.items.forEach((it) => {
      newCounts[it.product_id] = it.expected_stock;
    });
    setCounts(newCounts);
    showToast("All items filled with expected counts", "info");
  }, [sheetData, showToast]);

  // Live estimated stats during physical count
  const liveStats = useMemo(() => {
    if (!sheetData) return { totalSold: 0, totalRevenue: 0, totalProfit: 0 };

    let totalSold = 0;
    let totalRevenue = 0;
    let totalProfit = 0;

    sheetData.items.forEach((item) => {
      const counted = counts[item.product_id] ?? item.suggested_physical_count;
      const available = item.starting_stock + item.restocked_quantity;
      const sold = Math.max(0, available - counted);

      totalSold += sold;
      totalRevenue += sold * item.selling_price;
      totalProfit += sold * (item.selling_price - item.cost_price);
    });

    return { totalSold, totalRevenue, totalProfit };
  }, [sheetData, counts]);

  // Submit Audit Handler
  const handleSubmitAudit = async () => {
    if (!sheetData || submitting) return;
    setSubmitting(true);

    try {
      const payloadItems = sheetData.items.map((it) => ({
        product_id: it.product_id,
        physical_count: counts[it.product_id] ?? it.suggested_physical_count,
        discrepancy_notes: discrepancies[it.product_id] || undefined,
      }));

      const audit = await submitStockAudit({
        notes: auditNotes.trim() || undefined,
        items: payloadItems,
      });

      setCompletedAudit(audit);
      setIsReportModalOpen(true);
      await Promise.all([refreshInventory(), loadSheet(), loadHistory()]);
      showToast(`Audit #${audit.audit_code} completed successfully!`, "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit audit";
      showToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <AppHeader
        title="Weekly Stock Audit & Reconciliation"
        subtitle="Count physical shelves, reconcile mid-week deliveries, and calculate weekly sales"
        onOpenSidebar={() => setSidebarOpen(true)}
      />

      {/* Top Action & Mode Switcher */}
      <div className="px-4 sm:px-6 py-2.5 bg-white border-b border-zinc-200 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant={activeTab === "sheet" ? "default" : "ghost"}
            onClick={() => setActiveTab("sheet")}
            className="text-xs h-8 gap-1.5 rounded-lg font-medium"
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>Active Count Sheet</span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant={activeTab === "history" ? "default" : "ghost"}
            onClick={() => setActiveTab("history")}
            className="text-xs h-8 gap-1.5 rounded-lg font-medium"
          >
            <History className="w-3.5 h-3.5" />
            <span>Audit History ({pastAudits.length})</span>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadSheet}
            className="text-xs h-8 gap-1 text-zinc-500"
          >
            <RefreshCw className="w-3 h-3" />
            <span className="hidden sm:inline">Refresh Sheet</span>
          </Button>

          {activeTab === "sheet" && (
            <Button
              type="button"
              size="sm"
              disabled={submitting || loadingSheet}
              onClick={handleSubmitAudit}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 gap-1.5 font-semibold rounded-lg shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? "Reconciling..." : "Complete & Save Audit"}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main View Area */}
      <div className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto w-full flex-1">
        {activeTab === "sheet" ? (
          <>
            {/* Live KPI Reconciliation Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white border border-zinc-200 rounded-xl p-3.5 shadow-2xs">
                <span className="text-[11px] font-mono uppercase text-zinc-400">
                  Est. Units Sold This Period
                </span>
                <p className="text-2xl font-black text-zinc-900 font-mono mt-0.5">
                  {liveStats.totalSold} pcs
                </p>
                <span className="text-[10px] text-zinc-400">Based on counted shelf levels</span>
              </div>

              <div className="bg-white border border-zinc-200 rounded-xl p-3.5 shadow-2xs">
                <span className="text-[11px] font-mono uppercase text-zinc-400">
                  Est. Weekly Benta (Gross Revenue)
                </span>
                <p className="text-2xl font-black text-zinc-900 font-mono mt-0.5">
                  ₱{liveStats.totalRevenue.toFixed(2)}
                </p>
                <span className="text-[10px] text-zinc-400">Expected sales collected</span>
              </div>

              <div className="bg-white border border-zinc-200 rounded-xl p-3.5 shadow-2xs">
                <span className="text-[11px] font-mono uppercase text-zinc-400">
                  Est. Tubo (Gross Margin)
                </span>
                <p className="text-2xl font-black text-zinc-900 font-mono mt-0.5">
                  ₱{liveStats.totalProfit.toFixed(2)}
                </p>
                <span className="text-[10px] text-zinc-400">Net markup earnings</span>
              </div>
            </div>

            {/* Audit Counting Checklist */}
            {loadingSheet ? (
              <div className="h-64 flex items-center justify-center bg-white rounded-xl border border-zinc-200">
                <p className="text-xs text-zinc-400 font-mono animate-pulse">
                  Generating weekly inventory audit sheet...
                </p>
              </div>
            ) : sheetData ? (
              <AuditSheetTable
                items={sheetData.items}
                counts={counts}
                discrepancies={discrepancies}
                onCountChange={handleCountChange}
                onDiscrepancyChange={handleDiscrepancyChange}
                onSetAllToExpected={handleSetAllToExpected}
              />
            ) : null}
          </>
        ) : (
          /* Past Audits History */
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase font-mono text-zinc-500">
              Completed Weekly Audits
            </h4>
            {pastAudits.length === 0 ? (
              <div className="p-12 bg-white rounded-xl border border-dashed border-zinc-200 text-center">
                <p className="text-xs text-zinc-500">No past audits recorded yet.</p>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Complete your first weekly shelf count in the &quot;Active Count Sheet&quot; tab.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pastAudits.map((audit) => (
                  <Card
                    key={audit.id}
                    onClick={() => {
                      setCompletedAudit(audit);
                      setIsReportModalOpen(true);
                    }}
                    className="p-4 bg-white border-zinc-200 hover:border-blue-400 cursor-pointer transition-all rounded-xl shadow-2xs"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-mono text-xs font-bold text-zinc-900">
                          #{audit.audit_code}
                        </span>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          {audit.completed_at ? new Date(audit.completed_at).toLocaleDateString("en-PH", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }) : "—"}
                        </p>
                      </div>

                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                        {audit.total_items_audited} items
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-zinc-100 font-mono text-xs">
                      <div>
                        <span className="text-[10px] text-zinc-400 block">Sold</span>
                        <span className="font-bold text-zinc-800">{audit.total_units_sold} pcs</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-400 block">Benta</span>
                        <span className="font-bold text-emerald-700">₱{audit.total_expected_revenue.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-400 block">Tubo</span>
                        <span className="font-bold text-blue-700">₱{audit.total_gross_profit.toFixed(2)}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Post-Audit Scorecard Modal */}
      <AuditSummaryReportModal
        isOpen={isReportModalOpen}
        onOpenChange={setIsReportModalOpen}
        audit={completedAudit}
      />
    </div>
  );
}
