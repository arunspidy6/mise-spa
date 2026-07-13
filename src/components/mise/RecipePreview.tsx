import { motion, AnimatePresence } from "framer-motion";
import { X, ListChecks } from "lucide-react";
import type { Recipe } from "@/store/mise";

// The full recipe in the same bottom-sheet style as "Why this dish" — every
// ingredient with quantities and every step's full instruction, so the cook
// can read the whole thing before committing.
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
  const ingredients = recipe.ingredients ?? [];

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
            className="absolute inset-x-0 bottom-0 z-50 max-h-[85%] flex flex-col rounded-t-3xl bg-bg-surface border-t border-border-default shadow-2xl"
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
                    <p className="label-eyebrow leading-none">The full recipe</p>
                    <p className="text-[13px] text-text-secondary mt-1 leading-snug">
                      {ingredients.length} ingredients · {steps.length} steps · about {recipe.time_minutes} min.
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
              {/* Ingredients — with quantities */}
              {ingredients.length > 0 && (
                <div className="mb-6">
                  <p className="label-eyebrow mb-2.5">Ingredients</p>
                  <div className="space-y-1.5">
                    {ingredients.map((ing, i) => (
                      <div key={i} className="flex items-baseline justify-between gap-3">
                        <span className={`text-[14px] ${ing.inInventory === false ? "text-text-tertiary line-through" : "text-text-primary"}`}>
                          {ing.name}
                        </span>
                        <span className="text-[12px] text-text-tertiary font-mono flex-shrink-0">{ing.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Method — full step instructions */}
              <p className="label-eyebrow mb-3">Method</p>
              <div className="space-y-4">
                {steps.map((s, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="font-mono text-[12px] text-ember-text mt-0.5 flex-shrink-0 w-6">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p className="text-[14px] text-text-primary leading-relaxed">{s.instruction}</p>
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
