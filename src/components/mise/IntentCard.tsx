import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

// A selectable card for the "what matters tonight?" step. Calm, tappable, with a
// clear selected state that uses the ember accent without shouting.
export function IntentCard({
  emoji,
  label,
  sub,
  active,
  onClick,
}: {
  emoji: string;
  label: string;
  sub?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "relative w-full rounded-xl border px-4 py-3.5 flex items-center gap-3.5 text-left transition-all active:scale-[0.98]",
        active
          ? "bg-ember-glow border-ember-dim"
          : "bg-bg-surface border-border-default hover:border-border-strong",
      )}
    >
      <span className="text-[22px] leading-none flex-shrink-0">{emoji}</span>
      <span className="flex-1 min-w-0">
        <span className={cn("block text-[15px] font-medium", active ? "text-text-primary" : "text-text-primary")}>
          {label}
        </span>
        {sub && <span className="block text-[12px] text-text-tertiary mt-0.5 leading-snug">{sub}</span>}
      </span>
      <span
        className={cn(
          "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border transition-all",
          active ? "bg-ember border-ember" : "border-border-strong",
        )}
      >
        {active && <Check className="w-3 h-3 text-on-ember" strokeWidth={3} />}
      </span>
    </button>
  );
}
