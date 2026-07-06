import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { ArrowLeft, ArrowRight, Minus, Plus, Pencil, ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MobileFrame } from "@/components/mise/MobileFrame";
import { KeyboardAwareFooter } from "@/components/mise/KeyboardAwareFooter";
import { EmberButton } from "@/components/mise/EmberButton";
import { useMise } from "@/store/mise";
import { getRecipeFromAPI } from "@/lib/generate-recipe";
import type { CookHistory } from "@/lib/generate-recipe";
import { TIME_OPTIONS, VIBES } from "@/lib/mise-data";
import { track } from "@/lib/analytics";
import { RecipeLoaderContent } from "@/components/mise/RecipeLoader";

export const Route = createFileRoute("/session")({ component: SessionSetup });

type ErrState = { reason: string; detail: string };

function SessionSetup() {
  const navigate = useNavigate();
  const session = useMise(s => s.session);
  const setSession = useMise(s => s.setSession);
  const inventory = useMise(s => s.inventory);
  const setRecipe = useMise(s => s.setRecipe);
  const history = useMise(s => s.history);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<ErrState | null>(null);
  const [vibeOpen, setVibeOpen] = useState(false);

  // Single-select vibe stored as session.vibes ([] = no preference / surprise me).
  const selectedVibe = VIBES.find(v => v.value === session.vibes[0]) ?? null;
  const pickVibe = (value: string | null) => {
    setSession({ vibes: value ? [value] : [] });
    setVibeOpen(false);
    // Only log an actual pick (not a clear/deselect) so PostHog shows real usage.
    if (value) track("vibe_selected", { vibe: value });
  };

  const itemCount = inventory.proteins.length + inventory.carbs.length +
    inventory.vegetables.length + inventory.fridge.length;

  // Generation ID — cancels stale API responses if generate is called again
  const genIdRef = useRef(0);

  const generate = async () => {
    const genId = ++genIdRef.current;
    setLoading(true);
    setErr(null);

    // A real dish needs a hero. Staples (salt, oil, spices) are always
    // preselected, and carbs/fridge extras alone don't make a meal — require at
    // least one protein OR vegetable so we have something to build around.
    const mains = inventory.proteins.length + inventory.vegetables.length;
    if (mains < 1) {
      setLoading(false);
      setErr({
        reason: "no_main",
        detail: "Pick at least one protein or vegetable — that's the star of the dish, and we'll build the rest around what else you have.",
      });
      return;
    }

    try {
      // Always try the API first — it uses the full inventory (including custom veg/items)
      // and generates a recipe that actually matches what the user has.
      // 28 s timeout: Vercel function maxDuration is 30 s; Anthropic cold starts can be 6-12 s.
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 28000);
      let recipe = null;
      // Names of dishes the user has already cooked — deduped, most recent first.
      // The API uses these to generate something genuinely different, so the same
      // dish isn't re-suggested just because a different cut of the same meat
      // (e.g. lamb diced vs lamb chops) was selected.
      const avoidRecipes = [...new Set(history.map(h => h.name))].slice(0, 8);
      let apiFailure: "no_recipe" | "api_unreachable" | null = null;
      try {
        recipe = await getRecipeFromAPI(inventory, session, controller.signal, undefined, avoidRecipes);
      } catch (apiErr) {
        const m = apiErr instanceof Error ? apiErr.message : "";
        apiFailure = m === "no_recipe" ? "no_recipe" : "api_unreachable";
      } finally {
        clearTimeout(timeout);
      }

      if (genId !== genIdRef.current) return;

      // Honest failure — never silently substitute a random library recipe.
      if (!recipe) {
        setLoading(false);
        if (apiFailure === "no_recipe") {
          setErr({
            reason: "no_recipe",
            detail: "We couldn't make a good recipe from these ingredients right now. At breakfast time, things like bacon, sausages, eggs, oats or bread work best — try adding some, or come back at lunch.",
          });
        } else {
          setErr({
            reason: "api_unreachable",
            detail: "We couldn't reach the recipe kitchen. Check your connection and try again.",
          });
        }
        return;
      }

      if (genId !== genIdRef.current) return;
      setRecipe(recipe);
      navigate({ to: "/recipe" });
    } catch (e2) {
      const msg = e2 instanceof Error ? e2.message : "unknown";
      const parts = msg.split("|");
      setErr({ reason: parts[0], detail: parts[1] ?? "Something went wrong." });
    } finally {
      if (genId === genIdRef.current) setLoading(false);
    }
  };

  const isProteinErr = err?.reason === "no_protein_match";

  return (
    <MobileFrame>
      <AnimatePresence>
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-bg-base z-50 flex items-center justify-center">
            <RecipeLoaderContent />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Single linear column — no justify-between so sections stay grouped */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 pt-5 pb-4">
          <button onClick={() => navigate({ to: "/" })}
            className="w-10 h-10 -ml-2 flex items-center justify-center text-text-secondary active:scale-90">
            <ArrowLeft className="w-5 h-5" />
          </button>

          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
            <h1 className="font-display text-[28px] font-light text-text-primary">Tonight's cook</h1>
            <p className="text-[14px] text-text-secondary mt-1">Quick check before we find your recipe.</p>
          </motion.div>

          {/* Cooking from — text-left resets the button's default centre alignment
              so the label and item count share the same left edge. */}
          <button
            onClick={() => navigate({ to: "/inventory", search: { from: "session" } })}
            className="mt-5 w-full rounded-xl bg-bg-surface border border-border-default flex items-center justify-between gap-3 px-4 py-3.5 active:scale-[0.99] transition text-left"
          >
            <div className="flex flex-col items-start gap-1 min-w-0">
              <span className="label-eyebrow leading-none">Cooking from</span>
              <span className="text-[13px] text-text-primary leading-snug">
                {itemCount} {itemCount === 1 ? "item" : "items"} in your kitchen
              </span>
            </div>
            <span className="flex items-center gap-1.5 text-[12px] text-ember-text flex-shrink-0">
              <Pencil className="w-3.5 h-3.5" />Edit
            </span>
          </button>

          {/* What matters tonight — vibe filter (single-select dropdown) */}
          <div className="mt-6">
            <p className="label-eyebrow mb-3">What matters tonight?</p>
            <button
              onClick={() => setVibeOpen(o => !o)}
              aria-expanded={vibeOpen}
              className="w-full rounded-xl bg-bg-surface border border-border-default flex items-center justify-between gap-3 px-4 h-14 active:scale-[0.99] transition text-left"
            >
              <span className="flex items-center gap-3 min-w-0">
                <span className="text-lg flex-shrink-0">{selectedVibe?.emoji ?? "🍽️"}</span>
                <span className="flex flex-col min-w-0">
                  <span className="text-[14px] text-text-primary leading-tight truncate">
                    {selectedVibe?.label ?? "Surprise me"}
                  </span>
                  <span className="text-[12px] text-text-tertiary leading-tight truncate">
                    {selectedVibe?.detail ?? "No preference — best match for your kitchen"}
                  </span>
                </span>
              </span>
              <ChevronDown className={`w-4 h-4 text-text-tertiary flex-shrink-0 transition-transform ${vibeOpen ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {vibeOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 rounded-xl bg-bg-surface border border-border-default divide-y divide-border-subtle overflow-hidden">
                    {VIBES.map(v => {
                      const active = selectedVibe?.value === v.value;
                      return (
                        <button
                          key={v.value}
                          onClick={() => pickVibe(active ? null : v.value)}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left active:opacity-70 transition ${active ? "bg-ember-glow" : ""}`}
                        >
                          <span className="text-lg flex-shrink-0">{v.emoji}</span>
                          <span className="flex flex-col min-w-0 flex-1">
                            <span className={`text-[14px] leading-tight ${active ? "text-ember-text font-medium" : "text-text-primary"}`}>{v.label}</span>
                            <span className="text-[12px] text-text-tertiary leading-tight truncate">{v.detail}</span>
                          </span>
                          {active && <Check className="w-4 h-4 text-ember-text flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-6">
            <p className="label-eyebrow mb-3">How long do you have?</p>
            <div className="grid grid-cols-4 gap-2">
              {TIME_OPTIONS.map(o => {
                const active = session.timeMinutes === o.value;
                return (
                  <button key={o.value} onClick={() => setSession({ timeMinutes: o.value })}
                    className={`h-14 rounded-xl flex flex-col items-center justify-center gap-0.5 border transition-all active:scale-95
                      ${active ? "bg-ember-glow border-ember-dim text-ember-text" : "bg-bg-surface border-border-default text-text-secondary"}`}>
                    <span className="text-base">{o.icon}</span>
                    <span className="text-[11px] font-medium">{o.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pb-4">
            <p className="label-eyebrow mb-3">Cooking for</p>
            <div className="h-16 bg-bg-surface border border-border-default rounded-xl flex items-center justify-between px-4">
              <button onClick={() => setSession({ servings: Math.max(1, session.servings - 1) })}
                className="w-10 h-10 rounded-full bg-bg-raised flex items-center justify-center text-text-secondary active:scale-90">
                <Minus className="w-4 h-4" />
              </button>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-[40px] font-light text-text-primary tabular-nums">{session.servings}</span>
                <span className="text-[13px] text-text-tertiary">{session.servings === 1 ? "person" : "people"}</span>
              </div>
              <button onClick={() => setSession({ servings: Math.min(8, session.servings + 1) })}
                className="w-10 h-10 rounded-full bg-bg-raised flex items-center justify-center text-text-secondary active:scale-90">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>{/* end scrollable */}
        <KeyboardAwareFooter className="px-6">
          {err && (
            <div className="mb-4 rounded-xl bg-bg-surface border border-border-default p-4 space-y-3">
              <p className="text-[13px] font-semibold text-text-primary">
                {err.reason === "no_main"
                  ? "Add a main ingredient"
                  : isProteinErr
                    ? `No recipes found for ${inventory.proteins.join(", ")}`
                    : err.reason === "api_unreachable"
                      ? "Couldn't reach the kitchen"
                      : "Couldn't find a recipe"}
              </p>
              <p className="text-[12px] text-text-secondary leading-relaxed">{err.detail}</p>
              <div className="space-y-2 pt-1">
                {err.reason === "no_main" ? (
                  <>
                    <button onClick={() => navigate({ to: "/inventory", search: { from: "session", step: 1 } })}
                      className="w-full h-10 px-3 rounded-lg bg-ember/10 border border-ember-dim text-[13px] text-ember-text flex items-center justify-between active:opacity-70">
                      <span>🥩 Add a protein</span><span>→</span>
                    </button>
                    <button onClick={() => navigate({ to: "/inventory", search: { from: "session", step: 3 } })}
                      className="w-full h-10 px-3 rounded-lg bg-ember/10 border border-ember-dim text-[13px] text-ember-text flex items-center justify-between active:opacity-70">
                      <span>🥦 Add vegetables</span><span>→</span>
                    </button>
                  </>
                ) : (
                  <>
                    {isProteinErr && (
                      <button onClick={() => navigate({ to: "/inventory", search: { from: "session", step: 1 } })}
                        className="w-full h-10 px-3 rounded-lg bg-ember/10 border border-ember-dim text-[13px] text-ember-text flex items-center justify-between active:opacity-70">
                        <span>Select a different protein</span><span>→</span>
                      </button>
                    )}
                    <button onClick={() => navigate({ to: "/inventory", search: { from: "session" } })}
                      className="w-full h-10 px-3 rounded-lg bg-bg-raised border border-border-subtle text-[13px] text-text-secondary flex items-center justify-between active:opacity-70">
                      <span>Update my kitchen</span><span>→</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          <EmberButton size="lg" className="w-full" onClick={generate} disabled={loading}>
            Find me something <ArrowRight className="w-4 h-4" />
          </EmberButton>
        </KeyboardAwareFooter>
      </div>
    </MobileFrame>
  );
}
