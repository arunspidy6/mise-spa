import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Check, BarChart3, UtensilsCrossed, BookOpen } from "lucide-react";
import type { Recipe, Inventory } from "@/store/mise";
import { whyThisDish, type Meter } from "@/lib/why-this-dish";

// How the dish's origin is phrased — honest about being AI-composed while
// showing it's grounded in real cooking, not random.
const PROVENANCE: Record<string, { label: string; sentence: (cuisine: string) => string }> = {
  classic:  { label: "Classic",          sentence: c => `A recognised ${c} dish.` },
  adapted:  { label: "Adapted classic",  sentence: c => `A classic ${c} dish, adapted to what's in your kitchen.` },
  original: { label: "Original",         sentence: c => `An original combination, composed for your kitchen.` },
};

// A three-bar meter (Low / Medium / High) matching the ember + success palette.
function MeterBars({ level }: { level: Meter }) {
  const filled = level === "High" ? 3 : level === "Medium" ? 2 : 1;
  return (
    <span className="flex items-end gap-0.5 h-4" aria-hidden>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className={`w-1 rounded-full ${i < filled ? "bg-success" : "bg-border-default"}`}
          style={{ height: `${6 + i * 4}px` }}
        />
      ))}
    </span>
  );
}

function MeterCard({ label, level }: { label: string; level: Meter }) {
  return (
    <div className="flex-1 rounded-xl bg-bg-raised border border-border-subtle px-3 py-2.5">
      <p className="label-eyebrow leading-none">{label}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[15px] font-medium text-success">{level}</span>
        <MeterBars level={level} />
      </div>
    </div>
  );
}

// A bottom sheet explaining the match. Controlled by the recipe screen so its
// trigger can live inline in the content (no floating overlay over the CTAs).
export function WhyThisDish({
  recipe,
  inventory,
  open,
  onClose,
}: {
  recipe: Recipe;
  inventory: Inventory;
  open: boolean;
  onClose: () => void;
}) {
  // Prefer the model's own reasoning; derive a fallback for older/cached recipes
  // (or any where generation didn't return a usable "why").
  const aiWhy = recipe.why;
  const why = aiWhy?.reasons?.length ? aiWhy : whyThisDish(recipe, inventory);

  return (
    <>
      {/* Bottom sheet */}
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
              className="absolute inset-x-0 bottom-0 z-50 max-h-[88%] flex flex-col rounded-t-3xl bg-bg-surface border-t border-border-default shadow-2xl"
            >
              <div className="px-5 pt-3 pb-6 flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y">
                {/* Grab handle */}
                <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border-default" />

                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-ember-glow flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-ember-text" />
                    </span>
                    <div>
                      <p className="label-eyebrow leading-none">Why this dish</p>
                      <p className="text-[13px] text-text-secondary mt-1 leading-snug">
                        Picked for your kitchen, not at random.
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

                {/* Reasons */}
                <div className="mt-5 space-y-3">
                  {why.reasons.map((r, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 + i * 0.05 }}
                      className="flex items-start gap-3"
                    >
                      <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-success/15 flex items-center justify-center">
                        <Check className="w-3 h-3 text-success" />
                      </span>
                      <p className="text-[15px] text-text-primary leading-snug">{r}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Why these flavours work — the culinary reasoning, for trust */}
                {why.flavourRationale && (
                  <>
                    <div className="mt-6 flex items-center gap-2 text-text-tertiary">
                      <Sparkles className="w-3.5 h-3.5" />
                      <p className="label-eyebrow leading-none">Why these flavours work</p>
                    </div>
                    <p className="mt-2 text-[15px] text-text-primary leading-relaxed break-words">{why.flavourRationale}</p>
                  </>
                )}

                {/* How it tastes — a real description, not a rating */}
                <div className="mt-6 flex items-center gap-2 text-text-tertiary">
                  <UtensilsCrossed className="w-3.5 h-3.5" />
                  <p className="label-eyebrow leading-none">How it tastes</p>
                </div>
                <p className="mt-2 text-[15px] text-text-primary leading-snug">{why.tasteNote}</p>

                {/* At-a-glance meters */}
                <div className="mt-5 flex items-center gap-2 text-text-tertiary">
                  <BarChart3 className="w-3.5 h-3.5" />
                  <p className="label-eyebrow leading-none">At a glance</p>
                </div>
                <div className="mt-3 flex gap-2.5">
                  <MeterCard label="Completion" level={why.completion} />
                  <MeterCard label="Effort" level={why.effort} />
                </div>

                {/* Where it comes from — honest provenance to build trust */}
                <div className="mt-6 flex items-center gap-2 text-text-tertiary">
                  <BookOpen className="w-3.5 h-3.5" />
                  <p className="label-eyebrow leading-none">Where it comes from</p>
                </div>
                {why.provenance && (
                  <span className="mt-2 inline-flex items-center h-6 px-2.5 rounded-full bg-ember-glow border border-ember-dim text-[11px] font-semibold text-ember-text">
                    {PROVENANCE[why.provenance].label}
                  </span>
                )}
                <p className="mt-2 text-[13px] text-text-secondary leading-relaxed">
                  {why.provenance ? PROVENANCE[why.provenance].sentence(recipe.cuisine) + " " : ""}
                  Created by Mise's AI for your kitchen — grounded in real {recipe.cuisine} technique, not assembled at random.
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
