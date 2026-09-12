"use client";

import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppSidebar } from "./AppSidebar";
import { useInventory } from "@/context/InventoryContext";
import { Toaster } from "@/components/ui/toaster";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isSetupRoute = pathname === "/setup" || pathname === "/onboarding";

  const {
    sidebarOpen,
    setSidebarOpen,
    categories,
    totalSKUs,
    totalCapital,
    totalTubo,
    isOnboarded,
  } = useInventory();

  // If system is not onboarded and not currently on /setup, redirect to wizard
  useEffect(() => {
    if (isOnboarded === false && !isSetupRoute) {
      router.replace("/setup");
    }
  }, [isOnboarded, isSetupRoute, router]);

  // When on setup routes, provide full-width focused canvas without sidebar
  if (isSetupRoute) {
    return (
      <div className="min-h-screen w-full bg-slate-50 text-zinc-900 flex font-sans antialiased overflow-x-hidden">
        <Toaster />
        <div className="flex-1 w-full flex flex-col min-w-0 overflow-x-hidden">
          {children}
        </div>
      </div>
    );
  }

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
      />

      {/* Dynamic Inner Page Content */}
      <div className="flex-1 w-full lg:pl-64 flex flex-col min-w-0 overflow-x-hidden">
        {children}
      </div>
    </div>
  );
}
