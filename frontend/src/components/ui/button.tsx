import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-xs font-semibold transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none",
  {
    variants: {
      variant: {
        default:
          "bg-zinc-900 text-zinc-50 shadow-xs hover:bg-zinc-800 active:scale-[0.97]",
        destructive:
          "bg-rose-600 text-white shadow-xs hover:bg-rose-700 active:scale-[0.97]",
        outline:
          "border border-zinc-200 bg-white hover:bg-zinc-50 hover:border-zinc-300 hover:text-zinc-900 text-zinc-800 shadow-2xs active:scale-[0.97]",
        secondary:
          "bg-zinc-100 text-zinc-900 hover:bg-zinc-200 active:scale-[0.97]",
        ghost:
          "hover:bg-zinc-100 hover:text-zinc-900 text-zinc-700 active:scale-[0.97]",
        link: "text-zinc-900 underline-offset-4 hover:underline",
        emerald:
          "bg-emerald-600 text-white shadow-xs hover:bg-emerald-700 active:scale-[0.97]",
      },
      size: {
        default: "h-8 px-3.5 py-1.5",
        sm: "h-7 rounded-md px-2.5 text-[11px]",
        lg: "h-9 rounded-lg px-4 text-xs",
        icon: "h-7 w-7 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
