import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { ArrowLeft, ArrowRight, Clock, Sparkles, RotateCw, Check } from "lucide-react";
import { motion } from "framer-motion";
import { MobileFrame } from "@/components/mise/MobileFrame";
import { KeyboardAwareFooter } from "@/components/mise/KeyboardAwareFooter";
import { EmberButton } from "@/components/mise/EmberButton";
import { RecipeImage } from "@/components/mise/RecipeImage";
import { ConfidenceMeter } from "@/components/mise/ConfidenceMeter";
import { IngredientConfidenceList } from "@/components/mise/IngredientConfidenceList";
import { AdjustSheet } from "@/components/mise/AdjustSheet";
import { useMise } from "@/store/mise";
import { decide, type DecisionMeal } from "@/lib/decision-engine";

export const Route = createFileRoute("/decision")({ component: Decision });

function Decision() {
  const navigate = useNavigate();
  const urgent = useMise((s) => s.urgent);
  const intent = useMise((s) => s.intent);
  const history = useMise((s) => s.history);
  const setRecipe = useMise((s) => s.setRecipe);

  // The decision is pure given (urgent, intent, history) — compute it here so
  // the flow always reflects the latest capture without persisting engine state.
  const decision = useMemo(
    () => decide(urgent, intent, history),
    [urgent, intent, history],
  );

  const meals: DecisionMeal[] = useMemo(
    () => (decision ? [decision.best, ...decision.alternatives] : []),
    [decision],
  );
  const [idx, setIdx] = useState(0);
  const [adjustOpen, setAdjustOpen] = useState(false);

  // Surface the adjust sheet when the best we can do is missing an essential.
  useEffect(() => {
    if (decision?.needsAdjust) setAdjustOpen(true);
  }, [decision]);

  if (!decision || meals.length === 0) {
    return (
      <MobileFrame>
        <div className="flex-1 flex flex-col items-center justify-center px-8 gap-4 text-center">
          <span className="text-[40px]">🤔</span>
          <h1 className="font-display text-[22px] font-light text-text-primary">
            We couldn't find a confident match
          </h1>
          <p className="text-[13px] text-text-secondary leading-relaxed">
            There isn't a dish we'd stand behind for just these ingredients. Add one more — a protein, a carb or a veg —
            and we'll find something reliable.
          </p>
          <EmberButton onClick={() => navigate({ to: "/" })}>Add an ingredient</EmberButton>
        </div>
      </MobileFrame>
    );
  }

  const meal = meals[idx];
  const r = meal.recipe;
  const total = meals.length;

  const startCooking = () => {
    setRecipe(r);
    navigate({ to: "/cook" });
  };

  const seeAnother = () => setIdx((i) => (i + 1) % total);

  return (
    <MobileFrame>
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-shrink-0 px-4 pt-5 pb-1 flex items-center justify-between">
          <button
            onClick={() => navigate({ to: "/intent" })}
            className="w-10 h-10 -ml-2 flex items-center justify-center text-text-secondary active:scale-90"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          {total > 1 && (
            <span className="text-[11px] font-mono text-text-tertiary pr-2">
              Option {idx + 1} of {total}
            </span>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <motion.div
            key={r.name}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-5 pb-6 space-y-5"
          >
            {/* Verdict eyebrow */}
            <div className="flex items-center gap-1.5 pt-1">
              <Sparkles className="w-3.5 h-3.5 text-ember-text" />
              <span className="label-eyebrow text-ember-text">Tonight, make</span>
            </div>

            {/* Hero card */}
            <div className="rounded-2xl overflow-hidden bg-bg-surface border border-border-subtle">
              <RecipeImage src={r.image} cuisine={r.cuisine} alt={r.name} height={170} />
              <div className="p-4">
                <div className="flex gap-2 flex-wrap">
                  <span className="bg-ember-glow text-ember-text text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full">
                    {r.cuisine}
                  </span>
                  <span className="bg-bg-elevated text-text-secondary text-[10px] font-mono px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {r.time_minutes} min
                  </span>
                  <span className="bg-bg-elevated text-text-secondary text-[10px] font-mono px-2.5 py-1 rounded-full">
                    serves {r.servings}
                  </span>
                </div>
                <h1 className="font-display text-[26px] font-normal text-text-primary leading-[1.1] tracking-tight mt-3">
                  {r.name}
                </h1>
                <p className="text-[13px] text-text-tertiary leading-relaxed mt-2">{r.description}</p>
              </div>
            </div>

            {/* Why this meal */}
            <div>
              <p className="label-eyebrow mb-2.5">Why this meal</p>
              <div className="space-y-2">
                {meal.why.map((w, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="w-4 h-4 rounded-full bg-success/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-2.5 h-2.5 text-success" strokeWidth={3} />
                    </span>
                    <span className="text-[13px] text-text-secondary leading-snug">{w}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Confidence indicators */}
            <div className="flex gap-2">
              <ConfidenceMeter
                label="Completion"
                level={meal.completion}
                sentiment={meal.completion === "Low" ? "caution" : "positive"}
              />
              <ConfidenceMeter
                label="Effort"
                level={meal.effort}
                sentiment={meal.effort === "Low" ? "positive" : meal.effort === "High" ? "caution" : "neutral"}
              />
              <ConfidenceMeter
                label="Taste"
                level={meal.taste}
                sentiment={meal.taste === "Low" ? "caution" : "positive"}
              />
            </div>

            {/* Ingredient confidence */}
            <IngredientConfidenceList groups={meal.groups} />
          </motion.div>
        </div>

        {/* CTAs */}
        <KeyboardAwareFooter className="px-5 space-y-2.5">
          <EmberButton size="lg" className="w-full" onClick={startCooking}>
            Start cooking <ArrowRight className="w-4 h-4" />
          </EmberButton>
          {total > 1 && (
            <button
              onClick={seeAnother}
              className="w-full h-11 rounded-xl bg-bg-surface border border-border-default text-text-secondary flex items-center justify-center gap-2 text-[13px] active:scale-[0.98] transition"
            >
              <RotateCw className="w-3.5 h-3.5" />
              See another option
            </button>
          )}
          <p className="text-center text-[10px] text-text-tertiary leading-snug pt-0.5">
            Recipe times &amp; doneness are guidance — always check for yourself.
          </p>
        </KeyboardAwareFooter>

        {/* Screen 4 — only when a truly essential ingredient is missing */}
        <AdjustSheet
          open={adjustOpen}
          missing={decision.missingEssential}
          hasAlternative={total > 1}
          onWithWhatIHave={() => setAdjustOpen(false)}
          onChooseAnother={() => {
            if (total > 1) {
              seeAnother();
              setAdjustOpen(false);
            } else {
              navigate({ to: "/intent" });
            }
          }}
          onAddIngredient={() => navigate({ to: "/" })}
        />
      </div>
    </MobileFrame>
  );
}
