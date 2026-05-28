import { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg" | "hero";

export function EmberButton({
  children,
  variant = "primary",
  size = "md",
  className,
  ...props
}: { children: ReactNode; variant?: Variant; size?: Size } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 rounded-lg",
        size === "sm" && "h-8 px-3 text-[13px]",
        size === "md" && "h-11 px-5 text-[14px]",
        size === "lg" && "h-14 px-6 text-[15px]",
        size === "hero" && "h-[72px] px-6 text-[15px] rounded-xl",
        variant === "primary" && "bg-[#e8751a] text-[#0f0e0c] hover:brightness-110 shadow-ember",
        variant === "secondary" && "bg-bg-surface border border-border-default text-text-primary hover:border-border-strong",
        variant === "ghost" && "bg-transparent text-text-secondary hover:text-text-primary",
        className
      )}
    >
      {children}
    </button>
  );
}
