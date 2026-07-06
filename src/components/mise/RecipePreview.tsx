import { motion, AnimatePresence } from "framer-motion";
import { X, ListChecks } from "lucide-react";
import type { Recipe } from "@/store/mise";

// A read-ahead preview in the same bottom-sheet style as "Why this dish". It
// shows a BRIEF idea of each step (not the full recipe) so the cook can scan
// what's coming before committing. Full instructions live in cook mode.

// Short gist for a step: the model's `summary` if present, else a shortened
// first clause of the full instruction (for older/cached recipes).
function stepGist(step: { summary?: string; instruction?: string }): string {
  if (step.summary?.trim()) return step.summary.trim();
  const text = (step.instruction ?? "").trim();
  if (!text) return "";
  const firstSentence = text.split(/(?<=[.!?])\s/)[0];
  const clause = firstSentence.split(/,| until | and then /i)[0].trim();
  const short = clause.length > 52 ? clause.slice(0, 50).trimEnd() + "…" : clause;
  return short.replace(/[.,;:]$/, "");
}

export function RecipePreview({
  recipe,
  open,
  onClose,
}: {
  recipe: Recipe;
  open: boolean;
  onClose: () => void;
}) {
  const steps = recipe.steps ?? [];
  const ingredientNames = (recipe.ingredients ?? [])
    .filter(i => i.inInventory !== false)
    .map(i => i.name);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 z-40 bg-bg-base/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className="absolute inset-x-0 bottom-0 z-50 max-h-[82%] flex flex-col rounded-t-3xl bg-bg-surface border-t border-border-default shadow-2xl"
          >
            <div className="px-5 pt-3 flex-shrink-0">
              {/* Grab handle */}
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border-default" />
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-ember-glow flex items-center justify-center">
                    <ListChecks className="w-4 h-4 text-ember-text" />
                  </span>
                  <div>
                    <p className="label-eyebrow leading-none">The gist</p>
                    <p className="text-[13px] text-text-secondary mt-1 leading-snug">
                      A quick read-ahead — {steps.length} steps, about {recipe.time_minutes} min.
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="w-9 h-9 -mr-1 rounded-full flex items-center justify-center text-text-secondary active:scale-90"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 pb-6 pt-4">
              {/* What you'll use — names only, no quantities */}
              {ingredientNames.length > 0 && (
                <div className="mb-5">
                  <p className="label-eyebrow mb-2">You'll use</p>
                  <p className="text-[13px] text-text-secondary leading-relaxed">
                    {ingredientNames.join(" · ")}
                  </p>
                </div>
              )}

              {/* How it goes — one brief line per step */}
              <p className="label-eyebrow mb-3">How it goes</p>
              <div className="space-y-3">
                {steps.map((s, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="font-mono text-[11px] text-ember-text mt-0.5 flex-shrink-0 w-5">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p className="text-[14px] text-text-primary leading-snug">{stepGist(s)}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
