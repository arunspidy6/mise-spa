import { cn } from "@/lib/utils";
import type { ConfidenceLevel } from "@/lib/decision-engine";

type Sentiment = "positive" | "neutral" | "caution";

const FILL: Record<ConfidenceLevel, number> = { High: 3, Medium: 2, Low: 1 };

const TONE: Record<Sentiment, { bar: string; text: string }> = {
  positive: { bar: "bg-success", text: "text-success" },
  neutral: { bar: "bg-ember", text: "text-ember-text" },
  caution: { bar: "bg-warning", text: "text-warning" },
};

// A compact three-bar read-out for one confidence dimension. `sentiment` colours
// it by whether this reading is a *good* outcome — e.g. Effort "Low" is positive,
// so the caller passes sentiment="positive" even though the level is "Low".
export function ConfidenceMeter({
  label,
  level,
  sentiment,
}: {
  label: string;
  level: ConfidenceLevel;
  sentiment: Sentiment;
}) {
  const filled = FILL[level];
  const tone = TONE[sentiment];
  return (
    <div className="flex-1 rounded-xl bg-bg-surface border border-border-subtle px-3 py-2.5 flex flex-col gap-1.5">
      <span className="label-eyebrow leading-none">{label}</span>
      <div className="flex items-center justify-between gap-2">
        <span className={cn("text-[14px] font-semibold", tone.text)}>{level}</span>
        <div className="flex items-end gap-0.5 h-3.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={cn(
                "w-1 rounded-full transition-colors",
                i < filled ? tone.bar : "bg-border-default",
                i === 0 ? "h-2" : i === 1 ? "h-2.5" : "h-3.5",
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
