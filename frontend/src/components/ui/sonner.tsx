"use client";

import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-zinc-900 group-[.toaster]:border-zinc-200/90 group-[.toaster]:shadow-xl group-[.toaster]:rounded-xl font-sans text-xs group-[.toaster]:border group-[.toaster]:py-3 group-[.toaster]:px-4 group-[.toaster]:backdrop-blur-sm",
          description: "group-[.toast]:text-zinc-500 text-[11px]",
          actionButton:
            "group-[.toast]:bg-zinc-900 group-[.toast]:text-zinc-50 group-[.toast]:rounded-lg text-xs font-semibold px-3 py-1.5 shadow-sm active:scale-95 transition-transform",
          cancelButton:
            "group-[.toast]:bg-zinc-100 group-[.toast]:text-zinc-600 group-[.toast]:rounded-lg text-xs font-medium px-3 py-1.5 active:scale-95 transition-transform",
          closeButton:
            "group-[.toast]:border-zinc-200 group-[.toast]:bg-white group-[.toast]:text-zinc-500 hover:group-[.toast]:text-zinc-900 group-[.toast]:shadow-xs",
        },
      }}
      richColors
      closeButton
      position="bottom-right"
      duration={3500}
      gap={8}
      {...props}
    />
  );
};

export { Toaster, toast };
