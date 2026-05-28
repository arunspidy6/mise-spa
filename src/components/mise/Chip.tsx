import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

type Variant = "default" | "active" | "ghost";

export function Chip({
  label,
  active = false,
  onClick,
  variant = "default",
  emoji,
  showCheck = false,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
  variant?: Variant;
  emoji?: string;
  showCheck?: boolean;
}) {
  const isActive = active || variant === "active";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 h-8 px-3 rounded-full font-mono text-[11px] uppercase tracking-wider transition-all duration-150 active:scale-95 border",
        isActive
          ? "bg-[#e8751a] text-[#0f0e0c] border-[#e8751a]"
          : "bg-bg-raised text-text-secondary border-border-default hover:text-text-primary"
      )}
    >
      {emoji && <span className="text-sm">{emoji}</span>}
      <span className="font-sans normal-case tracking-normal text-[13px] font-medium">{label}</span>
      {isActive && showCheck && <Check className="w-3 h-3" />}
    </button>
  );
}
