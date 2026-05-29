import { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg" | "hero";

export function EmberButton({
  children,
  variant = "primary",
  size = "md",
  className,
  style,
  ...props
}: { children: ReactNode; variant?: Variant; size?: Size } & ButtonHTMLAttributes<HTMLButtonElement>) {
  const isPrimary = variant === "primary";

  const primaryStyle: CSSProperties = {
    // Layered background: subtle top highlight + flat ember — matches the home CTA
    background: "linear-gradient(to bottom, rgba(255,255,255,0.08) 0%, transparent 40%), var(--ember)",
    boxShadow: "var(--shadow-button)",
    color: "#0C0806",
  };

  return (
    <button
      {...props}
      style={isPrimary ? { ...primaryStyle, ...style } : style}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition-all duration-150",
        "active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100",
        "rounded-xl",   // --radius-xl = 14px, consistent with all primary buttons
        size === "sm"   && "h-8 px-3 text-[13px]",
        size === "md"   && "h-11 px-5 text-[14px]",
        size === "lg"   && "h-14 px-6 text-[15px]",
        size === "hero" && "h-[72px] px-6 text-[15px]",
        isPrimary    && "hover:brightness-110",
        variant === "secondary" && "bg-bg-elevated border border-border-default text-text-primary hover:border-border-strong",
        variant === "ghost"     && "bg-transparent text-text-secondary hover:text-text-primary",
        className
      )}
    >
      {children}
    </button>
  );
}
