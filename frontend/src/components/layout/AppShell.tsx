"use client";

import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { useInventory } from "@/context/InventoryContext";
import { Toaster } from "@/components/ui/toaster";

export function AppShell({ children }: { children: ReactNode }) {
  const {
    sidebarOpen,
    setSidebarOpen,
    categories,
    totalSKUs,
    totalCapital,
    totalTubo,
    refreshInventory,
  } = useInventory();

  return (
    <div className="min-h-screen w-full bg-slate-50 text-zinc-900 flex font-sans antialiased overflow-x-hidden">
      {/* High-Performance Animated Toaster */}
      <Toaster />

      {/* Persistent AppSidebar */}
      <AppSidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        categories={categories}
        totalSKUs={totalSKUs}
        totalCapital={totalCapital}
        totalTubo={totalTubo}
        onRefresh={refreshInventory}
      />

      {/* Dynamic Inner Page Content */}
      <div className="flex-1 w-full lg:pl-64 flex flex-col min-w-0 overflow-x-hidden">
        {children}
      </div>
    </div>
  );
}
