"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Store,
  X,
  BarChart3,
  Package,
  Settings,
  ScanBarcode,
  RefreshCw,
  Coins,
  TrendingUp,
  Layers,
  ShoppingCart,
  ClipboardCheck,
  BookUser,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Category } from "@/types/inventory";

interface AppSidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  categories?: Category[];
  selectedCategory?: number | string;
  onSelectCategory?: (id: number | "all") => void;
  totalSKUs?: number;
  totalCapital?: number;
  totalTubo?: number;
  onRefresh?: () => void;
}

export function AppSidebar({
  sidebarOpen,
  setSidebarOpen,
  categories = [],
  selectedCategory,
  onSelectCategory,
  totalSKUs = 0,
  totalCapital = 0,
  totalTubo = 0,
  onRefresh,
}: AppSidebarProps) {
  const pathname = usePathname();

  const isDashboard = pathname === "/";
  const isAudit = pathname === "/audit";
  const isDebts = pathname === "/debts";
  const isProducts = pathname === "/products";
  const isManage = pathname === "/manage";
  const isSettings = pathname === "/settings";

  return (
    <>
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-zinc-900/40 backdrop-blur-[2px] lg:hidden transition-opacity duration-200"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-zinc-200 flex flex-col transition-transform duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-zinc-100">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center">
              <Store className="w-4 h-4" />
            </div>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-zinc-400 hover:text-zinc-700"
            aria-label="Close navigation"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto p-3 space-y-5">
          {/* Main Navigation */}
          <div className="space-y-1">
            <span className="px-3 text-[10px] font-bold tracking-wider uppercase text-zinc-400 font-mono">
              Views
            </span>
            <Link href="/" className="block">
              <Button
                variant={isDashboard ? "default" : "ghost"}
                className="w-full justify-start gap-2 text-xs"
                onClick={() => setSidebarOpen(false)}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Store Dashboard</span>
              </Button>
            </Link>

            <Link href="/audit" className="block">
              <Button
                variant={isAudit ? "default" : "ghost"}
                className="w-full justify-start gap-2 text-xs font-semibold"
                onClick={() => setSidebarOpen(false)}
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                <span>Weekly Stock Audit</span>
              </Button>
            </Link>

            <Link href="/debts" className="block">
              <Button
                variant={isDebts ? "default" : "ghost"}
                className="w-full justify-start gap-2 text-xs font-semibold"
                onClick={() => setSidebarOpen(false)}
              >
                <BookUser className="w-3.5 h-3.5 " />
                <span>Customer Debts</span>
              </Button>
            </Link>

            <Link href="/products" className="block">
              <Button
                variant={isProducts ? "default" : "ghost"}
                className="w-full justify-between text-xs"
                onClick={() => setSidebarOpen(false)}
              >
                <div className="flex items-center gap-2">
                  <Package className="w-3.5 h-3.5" />
                  <span>List of Items</span>
                </div>
                {totalSKUs > 0 && (
                  <Badge
                    variant={isProducts ? "secondary" : "outline"}
                    className="text-[10px] px-1.5 py-0 font-mono"
                  >
                    {totalSKUs}
                  </Badge>
                )}
              </Button>
            </Link>
          </div>

          {/* Operations */}
          <div className="space-y-1">
            <span className="px-3 text-[10px] font-bold tracking-wider uppercase text-zinc-400 font-mono">
              Operations
            </span>
            <Link href="/manage" className="block">
              <Button
                variant={isManage ? "default" : "ghost"}
                className="w-full justify-start gap-2 text-xs"
                onClick={() => setSidebarOpen(false)}
              >
                <ScanBarcode className="w-3.5 h-3.5" />
                <span>Receipt &amp; Barcode Station</span>
              </Button>
            </Link>
          </div>

          {/* Preferences */}
          <div className="space-y-1">
            <span className="px-3 text-[10px] font-bold tracking-wider uppercase text-zinc-400 font-mono">
              Preferences
            </span>
            <Link href="/settings" className="block">
              <Button
                variant={isSettings ? "default" : "ghost"}
                className="w-full justify-start gap-2 text-xs"
                onClick={() => setSidebarOpen(false)}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Store Settings</span>
              </Button>
            </Link>
          </div>

          {/* Categories Filter (if provided) */}
          {categories.length > 0 && onSelectCategory && (
            <>
              <Separator />
              <div className="space-y-1">
                <span className="px-3 text-[10px] font-bold tracking-wider uppercase text-zinc-400 font-mono">
                  Categories
                </span>
                <Button
                  variant={selectedCategory === "all" ? "default" : "ghost"}
                  onClick={() => {
                    onSelectCategory("all");
                    setSidebarOpen(false);
                  }}
                  className="w-full justify-start gap-2 truncate text-xs"
                >
                  <Layers className="w-3.5 h-3.5 shrink-0" />
                  <span>All Categories</span>
                </Button>
                {categories.map((cat) => (
                  <Button
                    key={cat.id}
                    variant={selectedCategory === cat.id ? "default" : "ghost"}
                    onClick={() => {
                      onSelectCategory(cat.id);
                      setSidebarOpen(false);
                    }}
                    className="w-full justify-start gap-2 truncate text-xs"
                  >
                    <Layers className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{cat.name}</span>
                  </Button>
                ))}
              </div>
            </>
          )}

          {/* Financial Summary Card */}
          {totalCapital > 0 && (
            <Card className="bg-zinc-50 border-zinc-200 shadow-2xs">
              <CardContent className="p-3 space-y-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block font-mono">
                  Store Valuation
                </span>
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-1.5 text-zinc-500">
                    <Coins className="w-3.5 h-3.5" />
                    <span>Puhunan</span>
                  </div>
                  <span className="font-mono font-semibold text-zinc-800">
                    ₱
                    {totalCapital.toLocaleString("en-PH", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Est. Tubo</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-600">
                    +₱
                    {totalTubo.toLocaleString("en-PH", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-zinc-100 text-[11px] text-zinc-400 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>MySQL Synced</span>
          </div>
          {onRefresh && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onRefresh}
              title="Refresh data"
              className="h-6 w-6 text-zinc-400 hover:text-zinc-700"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </aside>
    </>
  );
}
