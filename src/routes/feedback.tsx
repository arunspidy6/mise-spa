import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { MobileFrame } from "@/components/mise/MobileFrame";
import { useMise } from "@/store/mise";

export const Route = createFileRoute("/feedback")({ component: FeedbackPage });

const RATINGS = [
  { id: "loved",  emoji: "❤️",  label: "Loved it",             sub: "Adding this to my rotation", color: "border-success bg-success/10" },
  { id: "good",   emoji: "👍",  label: "Pretty good",          sub: "I'd make it again sometime",  color: "border-ember-dim bg-ember-glow" },
  { id: "skip",   emoji: "👎",  label: "Not making this again", sub: "Won't suggest this again",    color: "border-border-default bg-bg-raised" },
] as const;

type RatingId = typeof RATINGS[number]["id"];

function FeedbackPage() {
  const navigate = useNavigate();
  const recipe = useMise(s => s.recipe);
  const addHistory = useMise(s => s.addHistory);
  const history = useMise(s => s.history);
  const [selected, setSelected] = useState<RatingId | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const submit = () => {
    if (!selected || !recipe) return;
    // Update the last history entry with the real rating
    // (cook.tsx already added it with "good", we update it here)
    addHistory({ name: recipe.name, cuisine: recipe.cuisine, rating: selected, ts: Date.now() });
    setSubmitted(true);
    setTimeout(() => navigate({ to: "/" }), 1800);
  };

  if (submitted) {
    return (
      <MobileFrame>
        <div className="flex-1 flex flex-col items-center justify-center px-8 gap-6">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 10 }}
            className="text-[60px]">
            {RATINGS.find(r => r.id === selected)?.emoji}
          </motion.div>
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="font-display text-[22px] font-light text-text-primary text-center">
            Thanks — we'll remember that.
          </motion.p>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="text-[13px] text-text-tertiary text-center">
            {RATINGS.find(r => r.id === selected)?.sub}
          </motion.p>
        </div>
      </MobileFrame>
    );
  }

  return (
    <MobileFrame>
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 pt-16 pb-4">

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <span className="text-[44px]">🍽️</span>
          <h1 className="font-display text-[28px] font-light text-text-primary mt-4 leading-tight">
            How was{" "}
            <span className="text-ember italic">{recipe?.name ?? "the dish"}</span>?
          </h1>
          <p className="text-[14px] text-text-secondary mt-2 leading-relaxed">
            Your feedback helps Mise suggest better recipes over time.
          </p>
        </motion.div>

        <div className="mt-8 flex flex-col gap-3">
          {RATINGS.map((r, i) => (
            <motion.button
              key={r.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
              onClick={() => setSelected(r.id)}
              className={`h-20 rounded-2xl border-2 px-5 flex items-center gap-4 transition-all active:scale-[0.98]
                ${selected === r.id ? r.color + " scale-[0.99]" : "border-border-default bg-bg-surface"}`}
            >
              <span className="text-[32px]">{r.emoji}</span>
              <div className="text-left">
                <p className={`text-[15px] font-semibold ${selected === r.id ? "text-text-primary" : "text-text-primary"}`}>
                  {r.label}
                </p>
                <p className="text-[12px] text-text-tertiary mt-0.5">{r.sub}</p>
              </div>
              {selected === r.id && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                  className="ml-auto w-6 h-6 rounded-full bg-ember flex items-center justify-center flex-shrink-0">
                  <span className="text-bg-base text-[12px]">✓</span>
                </motion.div>
              )}
            </motion.button>
          ))}
        </div>

        </div>{/* end scrollable content */}

        {/* Sticky bottom buttons */}
        <div className="flex-shrink-0 px-6 pb-10 pt-3 bg-bg-base border-t border-border-subtle space-y-3">
          <button
            onClick={submit}
            disabled={!selected}
            className="w-full h-14 rounded-2xl bg-ember text-bg-base text-[15px] font-semibold active:scale-[0.98] transition disabled:opacity-40 shadow-[0_4px_20px_rgba(232,117,26,0.3)]">
            Save feedback →
          </button>
          <button
            onClick={() => navigate({ to: "/" })}
            className="w-full h-12 text-[13px] text-text-tertiary active:opacity-70">
            Skip — go home
          </button>
        </div>
      </div>
    </MobileFrame>
  );
}
