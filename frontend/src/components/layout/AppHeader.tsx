"use client";

import { ReactNode } from "react";
import { Menu, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  currentTime?: string;
  onOpenSidebar: () => void;
  actions?: ReactNode;
}

export function AppHeader({
  title,
  subtitle,
  currentTime,
  onOpenSidebar,
  actions,
}: AppHeaderProps) {
  return (
    <header className="h-16 min-h-16 bg-white border-b border-zinc-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3 sticky top-0 z-30">
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenSidebar}
          className="md:hidden text-zinc-600 hover:text-zinc-900 shrink-0 h-8 w-8"
          aria-label="Open navigation"
        >
          <Menu className="w-4 h-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-zinc-900 truncate">
              {title}
            </h2>
            {currentTime && (
              <span className="hidden xl:inline-flex items-center gap-1 text-[11px] font-mono font-normal text-zinc-400 border-l border-zinc-200 pl-2 shrink-0">
                <Clock className="w-3 h-3 text-zinc-400" />
                {currentTime}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-[11px] text-zinc-400 truncate max-w-sm sm:max-w-md lg:max-w-xl">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </header>
  );
}
