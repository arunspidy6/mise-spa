import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowLeft, ArrowRight, Clock, Users, RotateCw, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MobileFrame } from "@/components/mise/MobileFrame";
import { EmberButton } from "@/components/mise/EmberButton";
import { RecipeImage } from "@/components/mise/RecipeImage";
import { useMise } from "@/store/mise";
import { getRecipe, getRecipeFromAPI } from "@/lib/generate-recipe";

export const Route = createFileRoute("/recipe")({ component: RecipeCard });


// ── Reroll Loader — same carousel animation as session ────────────────────
const REROLL_DISHES = [
  { emoji: "🥘", name: "Something hearty" },
  { emoji: "🍳", name: "Something quick" },
  { emoji: "🍜", name: "Something comforting" },
  { emoji: "🥩", name: "Something bold" },
  { emoji: "🫕", name: "Something warming" },
];

function RerollLoaderContent() {
  const [idx, setIdx] = useState(0);
  const [dir] = useState(1);
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % REROLL_DISHES.length), 700);
    return () => clearInterval(t);
  }, []);
  const dish = REROLL_DISHES[idx];
  return (
    <div className="flex flex-col items-center justify-center px-8 w-full h-full">
      <div className="relative w-56 h-40 mb-6 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ x: 60 * dir, opacity: 0, scale: 0.92 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: -60 * dir, opacity: 0, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-bg-surface border border-border-subtle rounded-3xl"
          >
            <motion.span
              animate={{ y: [0, -6, 0], rotate: [-3, 3, -3] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              className="text-[48px]"
            >
              {dish.emoji}
            </motion.span>
            <p className="font-display text-[15px] font-light text-text-primary">{dish.name}</p>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="flex gap-1.5 mb-5">
        {REROLL_DISHES.map((_, i) => (
          <motion.div key={i}
            animate={{ width: i === idx ? 16 : 5, opacity: i === idx ? 1 : 0.3 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="h-1.5 rounded-full bg-ember"
          />
        ))}
      </div>
      <p className="font-display text-[18px] font-light text-text-primary">Finding something different…</p>
    </div>
  );
}

function RecipeCard() {
  const navigate = useNavigate();
  const recipe = useMise(s => s.recipe);
  const inventory = useMise(s => s.inventory);
  const session = useMise(s => s.session);
  const setRecipe = useMise(s => s.setRecipe);
  const [rerolling, setRerolling] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  if (!recipe) {
    return (
      <MobileFrame>
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
          <p className="text-text-secondary text-[15px] text-center">No recipe loaded.</p>
          <button onClick={() => navigate({ to: "/session" })}
            className="h-12 px-6 rounded-xl bg-ember text-bg-base text-[14px] font-semibold">
            ← Back
          </button>
        </div>
      </MobileFrame>
    );
  }

  const swaps = recipe.requiredSwaps ?? [];
  const optional = recipe.optionalMissing ?? [];
  const allGood = swaps.length === 0 && optional.length === 0;
  const diff = ["", "Easy", "Medium", "Challenging"][recipe.difficulty] ?? "Medium";

  const swap = async () => {
    setRerolling(true);
    setErrMsg(null);

    let next = null;
    try {
      // Abort the API call after 4 s so the loader never gets stuck
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      try {
        next = await getRecipeFromAPI(inventory, session, controller.signal);
      } catch {
        // API unavailable or timed out — use local library
      } finally {
        clearTimeout(timeout);
      }

      if (!next) {
        next = getRecipe(inventory, session);
      }

      setRecipe(next);
    } catch {
      setErrMsg("No more recipes found for your kitchen.");
    } finally {
      setRerolling(false);
    }
  };

  return (
    <MobileFrame>
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex-shrink-0 px-4 pt-12 pb-2">
          <button onClick={() => navigate({ to: "/session" })}
            className="w-10 h-10 -ml-2 flex items-center justify-center text-text-secondary active:scale-90">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Reroll loader — always in DOM, opacity driven by rerolling state.
            No AnimatePresence: pointer-events is set in the same React render
            as the fade so the overlay never blocks clicks while fading out. */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: rerolling ? 1 : 0 }}
          transition={{ duration: 0.25 }}
          style={{ pointerEvents: rerolling ? "auto" : "none" }}
          className="absolute inset-0 bg-bg-base/96 z-50"
        >
          {rerolling && <RerollLoaderContent />}
        </motion.div>

        <div className="flex-1 overflow-y-auto">
        <motion.div key={recipe.name}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="px-4 space-y-4 pt-2 pb-4">

          {/* Recipe card */}
          <div className="rounded-xl overflow-hidden bg-bg-surface border border-border-subtle">
            <RecipeImage src={recipe.image} cuisine={recipe.cuisine} alt={recipe.name} height={220}>
              <div className="p-4 flex flex-col justify-end gap-2">
                <div className="flex gap-2 flex-wrap">
                  <span className="bg-ember text-bg-base text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full">
                    {recipe.cuisine}
                  </span>
                  <span className="bg-black/50 backdrop-blur-sm text-white text-[10px] font-mono px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Clock className="w-3 h-3" />{recipe.time_minutes} min
                  </span>
                </div>
                <h2 className="font-display text-[24px] font-light text-white leading-tight drop-shadow-md">
                  {recipe.name}
                </h2>
              </div>
            </RecipeImage>

            <div className="p-4 space-y-3">
              {/* Match status */}
              {allGood && (
                <div className="flex items-center gap-1.5">
                  <span className="text-success">✓</span>
                  <span className="text-[12px] text-success font-medium">You have everything</span>
                </div>
              )}
              {swaps.length > 0 && (
                <div className="rounded-lg border border-ember-dim bg-ember-glow p-3 space-y-2">
                  <p className="text-[12px] font-semibold text-ember-text">
                    {swaps.length === 1 ? "1 swap needed" : `${swaps.length} swaps needed`}
                  </p>
                  {swaps.map((s, i) => (
                    <div key={i} className="pl-3 border-l-2 border-ember-dim">
                      <p className="text-[12px] font-medium text-text-primary">Instead of {s.ingredient}:</p>
                      <p className="text-[11px] text-text-secondary leading-relaxed">{s.swap}</p>
                    </div>
                  ))}
                </div>
              )}
              {optional.length > 0 && swaps.length === 0 && (
                <p className="text-[11px] text-text-tertiary italic">
                  {optional.join(", ")} missing — optional, dish works without {optional.length === 1 ? "it" : "them"}.
                </p>
              )}

              <p className="text-[14px] text-text-secondary leading-relaxed">{recipe.description}</p>

              <div className="flex items-center justify-between text-[12px] text-text-tertiary pt-1 border-t border-border-subtle">
                <span>{diff}</span>
                <div className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /><span>Serves {recipe.servings}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recipe preview dropdown */}
          <div className="rounded-xl bg-bg-surface border border-border-subtle overflow-hidden">
            <button
              onClick={() => setPreviewOpen(o => !o)}
              className="w-full flex items-center justify-between px-4 py-3.5 active:opacity-70 transition-opacity"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">📋</span>
                <span className="text-[13px] font-medium text-text-primary">Preview full recipe</span>
                <span className="text-[11px] text-text-tertiary">
                  {recipe.ingredients?.length ?? 0} ingredients · {recipe.steps?.length ?? 0} steps
                </span>
              </div>
              {previewOpen
                ? <ChevronUp className="w-4 h-4 text-text-tertiary" />
                : <ChevronDown className="w-4 h-4 text-text-tertiary" />
              }
            </button>

            <AnimatePresence>
              {previewOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-4 border-t border-border-subtle pt-3">
                    {/* Ingredients */}
                    <div>
                      <p className="label-eyebrow mb-2">Ingredients</p>
                      <div className="space-y-1.5">
                        {recipe.ingredients?.map((ing, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <span className={`text-[13px] ${ing.inInventory === false ? "text-text-tertiary line-through" : "text-text-primary"}`}>
                              {ing.name}
                            </span>
                            <span className="text-[12px] text-text-tertiary font-mono">{ing.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Steps overview */}
                    <div>
                      <p className="label-eyebrow mb-2">Steps overview</p>
                      <div className="space-y-2">
                        {recipe.steps?.map((step, i) => (
                          <div key={i} className="flex gap-3">
                            <span className="font-mono text-[11px] text-ember-text mt-0.5 flex-shrink-0">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <p className="text-[12px] text-text-secondary leading-relaxed">{step.instruction}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {errMsg && <p className="text-center text-[13px] text-error">{errMsg}</p>}
        </motion.div>
        </div>{/* end scroll */}

        {/* Sticky bottom CTAs — always visible */}
        <div className="flex-shrink-0 px-4 pb-10 pt-3 bg-bg-base border-t border-border-subtle space-y-2">
          <div className="flex gap-3">
            <button onClick={swap} disabled={rerolling}
              className="flex-1 h-14 rounded-xl bg-bg-surface border border-border-default text-text-secondary flex items-center justify-center gap-2 text-[14px] active:scale-95 transition disabled:opacity-50">
              <RotateCw className="w-4 h-4" />
              Not this
            </button>
            <EmberButton size="lg" className="flex-1" onClick={() => navigate({ to: "/cook" })}>
              Let's make it <ArrowRight className="w-4 h-4" />
            </EmberButton>
          </div>
          {swaps.length > 0 && (
            <button onClick={() => navigate({ to: "/session" })}
              className="w-full text-center text-[12px] text-text-tertiary py-1 active:opacity-70">
              These swaps don't work for me — try a different recipe
            </button>
          )}
        </div>
      </div>
    </MobileFrame>
  );
}
