import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { MobileFrame } from "@/components/mise/MobileFrame";
import { KeyboardAwareFooter } from "@/components/mise/KeyboardAwareFooter";
import { useMise } from "@/store/mise";
import { cancelRecipeReminder } from "@/lib/reminders";
import { track } from "@/lib/analytics";

export const Route = createFileRoute("/feedback")({ component: FeedbackPage });

// Map the on-screen rating ids to the analytics vocabulary.
const RATING_EVENT: Record<string, "loved" | "pretty_good" | "not_for_me"> = {
  loved: "loved",
  good: "pretty_good",
  skip: "not_for_me",
};

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
  const unsaveRecipe = useMise(s => s.unsaveRecipe);
  const clearProteinsAndVeggies = useMise(s => s.clearProteinsAndVeggies);
  const [selected, setSelected] = useState<RatingId | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const submit = () => {
    if (!selected || !recipe) return;
    track("recipe_rated", { rating: RATING_EVENT[selected] });
    addHistory({ name: recipe.name, cuisine: recipe.cuisine, rating: selected, ts: Date.now() });
    // Cooking moves the recipe out of "saved to cook" — it now lives in the
    // journal, and its history entry already excludes it from future generation.
    unsaveRecipe(recipe.name);
    cancelRecipeReminder(recipe.name);
    // Proteins and veg run out after cooking — reset them so the user
    // picks fresh ingredients next time. Staples/spices are kept.
    clearProteinsAndVeggies();
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
            Thanks! We'll remember that.
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
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Scrollable content */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 pt-16 pb-4">

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
              className={`h-20 rounded-xl border-2 px-5 flex items-center gap-4 transition-all active:scale-[0.98]
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
        <KeyboardAwareFooter className="px-6 space-y-3">
          <button
            onClick={submit}
            disabled={!selected}
            style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.08) 0%, transparent 40%), var(--ember)", boxShadow: "var(--shadow-button)", color: "var(--on-ember)" }}
            className="w-full h-14 rounded-xl text-[15px] font-semibold active:scale-[0.98] transition disabled:opacity-40">
            Save feedback →
          </button>
          <button
            onClick={() => navigate({ to: "/" })}
            className="w-full h-12 text-[13px] text-text-tertiary active:opacity-70">
            Go home
          </button>
        </KeyboardAwareFooter>
      </div>
    </MobileFrame>
  );
}
