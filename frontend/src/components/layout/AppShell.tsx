"use client";

import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppSidebar } from "./AppSidebar";
import { useInventory } from "@/context/InventoryContext";
import { Toaster } from "@/components/ui/toaster";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isOnboardingRoute = pathname === "/onboarding";

  const {
    sidebarOpen,
    setSidebarOpen,
    categories,
    totalSKUs,
    totalCapital,
    totalTubo,
    refreshInventory,
    isOnboarded,
  } = useInventory();

  // If system is not onboarded and not currently on /onboarding, redirect to wizard
  useEffect(() => {
    if (isOnboarded === false && !isOnboardingRoute) {
      router.replace("/onboarding");
    }
  }, [isOnboarded, isOnboardingRoute, router]);

  // When on /onboarding, provide full-width focused canvas without sidebar
  if (isOnboardingRoute) {
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
        onRefresh={refreshInventory}
      />

      {/* Dynamic Inner Page Content */}
      <div className="flex-1 w-full lg:pl-64 flex flex-col min-w-0 overflow-x-hidden">
        {children}
      </div>
    </div>
  );
}
