import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { ArrowLeft, ArrowRight, Minus, Plus, Pencil } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MobileFrame } from "@/components/mise/MobileFrame";
import { EmberButton } from "@/components/mise/EmberButton";
import { useMise } from "@/store/mise";
import { findRecipes, getRecipe, getRecipeFromAPI } from "@/lib/generate-recipe";
import type { CookHistory } from "@/lib/generate-recipe";
import { TIME_OPTIONS } from "@/lib/mise-data";

export const Route = createFileRoute("/session")({ component: SessionSetup });

type ErrState = { reason: string; detail: string };

// ── Loader animation ─────────────────────────────────────────────────────────
// Hand-drawn bubbling pot in the terracotta theme. The dish names cycle below
// so it still feels like Mise is "flipping through" options for you.
const DISHES = [
  "Soy-glazed chicken",
  "Shakshuka",
  "Egg fried rice",
  "Garlic butter steak",
  "Chickpea curry",
  "Garlic butter pasta",
  "Soy-glazed salmon",
  "Lentil soup",
];

const LOADER_MESSAGES = [
  "Checking what you have…",
  "Finding something different…",
  "Matching your ingredients…",
  "Almost ready…",
];

// Bubbling pot — single-weight line art with rising steam + simmering bubbles.
function BubblingPot() {
  return (
    <svg width="184" height="172" viewBox="0 0 180 172" fill="none" style={{ overflow: "visible" }}>
      {/* steam */}
      <motion.g
        stroke="var(--ink)" strokeWidth={4} strokeLinecap="round" fill="none"
        animate={{ opacity: [0.25, 0.9, 0.25], y: [4, -6, 4] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      >
        <path d="M64 34 q-8 -12 2 -22 q7 -7 0 -16" />
        <path d="M90 28 q8 -13 -2 -23 q-7 -7 0 -15" opacity={0.85} />
        <path d="M116 34 q-8 -12 3 -20 q6 -6 0 -15" opacity={0.7} />
      </motion.g>

      {/* pot */}
      <g stroke="var(--ink)" strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M40 76 q-2 56 12 76 q38 14 76 0 q14 -20 12 -76 Z" />
        <path d="M32 76 q58 -14 116 0" />
        <path d="M32 84 q-16 2 -14 16 q1 9 12 9" />
        <path d="M148 84 q16 2 14 16 q-1 9 -12 9" />
      </g>

      {/* simmering bubbles */}
      {[
        { cx: 72, cy: 108, r: 6, d: 0 },
        { cx: 96, cy: 118, r: 8, d: 0.4 },
        { cx: 118, cy: 106, r: 5, d: 0.8 },
      ].map((b, i) => (
        <motion.circle
          key={i}
          cx={b.cx} cy={b.cy} r={b.r}
          fill="var(--ink-soft)" stroke="var(--ink)" strokeWidth={3}
          animate={{ scale: [0.5, 1, 0.5], opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: b.d }}
          style={{ transformOrigin: `${b.cx}px ${b.cy}px` }}
        />
      ))}
    </svg>
  );
}

function RecipeLoader() {
  const [dishIdx, setDishIdx] = useState(0);
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    const dishTimer = setInterval(() => {
      setDishIdx(i => (i + 1) % DISHES.length);
    }, 1100);
    const msgTimer = setInterval(() => {
      setMsgIdx(i => (i + 1) % LOADER_MESSAGES.length);
    }, 1800);
    return () => { clearInterval(dishTimer); clearInterval(msgTimer); };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="theme-terracotta fixed inset-0 bg-bg-base z-50 flex flex-col items-center justify-center px-8"
    >
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="mb-6"
      >
        <BubblingPot />
      </motion.div>

      {/* Cycling dish name — feels like Mise is leafing through the options */}
      <div className="h-8 flex items-center justify-center mb-7">
        <AnimatePresence mode="wait">
          <motion.p
            key={dishIdx}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 26 }}
            className="font-display italic text-[19px] font-light text-ember-text text-center"
          >
            {DISHES[dishIdx]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Dot indicators */}
      <div className="flex gap-1.5 mb-8">
        {DISHES.map((_, i) => (
          <motion.div
            key={i}
            animate={{ width: i === dishIdx ? 20 : 6, opacity: i === dishIdx ? 1 : 0.3 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="h-1.5 rounded-full bg-ember"
          />
        ))}
      </div>

      {/* Cycling status message */}
      <AnimatePresence mode="wait">
        <motion.p
          key={msgIdx}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="font-display text-[20px] font-light text-text-primary text-center"
        >
          {LOADER_MESSAGES[msgIdx]}
        </motion.p>
      </AnimatePresence>

      <p className="text-[12px] text-text-secondary mt-3 text-center">
        Something you haven't made before
      </p>
    </motion.div>
  );
}

function SessionSetup() {
  const navigate = useNavigate();
  const session = useMise(s => s.session);
  const setSession = useMise(s => s.setSession);
  const inventory = useMise(s => s.inventory);
  const setRecipe = useMise(s => s.setRecipe);
  const history = useMise(s => s.history);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<ErrState | null>(null);

  const itemCount = inventory.proteins.length + inventory.carbs.length +
    inventory.vegetables.length + inventory.fridge.length;

  // Generation ID — cancels stale API responses if generate is called again
  const genIdRef = useRef(0);

  const generate = async () => {
    const genId = ++genIdRef.current;
    setLoading(true);
    setErr(null);

    // Staples (salt, oil, spices) are always preselected, so they don't prove
    // the user actually added anything. Require at least one real, non-staple
    // ingredient before calling the API.
    const nonStaples = [
      ...inventory.proteins, ...inventory.carbs,
      ...inventory.vegetables, ...inventory.fridge,
    ];
    if (nonStaples.length < 1) {
      setLoading(false);
      setErr({ reason: "no_ingredients", detail: "Add some ingredients to your kitchen first." });
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
      try {
        recipe = await getRecipeFromAPI(inventory, session, controller.signal, undefined, avoidRecipes);
      } catch {
        // API unavailable or timed out — fall back to local library
      } finally {
        clearTimeout(timeout);
      }

      if (genId !== genIdRef.current) return;

      if (!recipe) {
        // Library fallback: validate first so we show a useful error if there's no match
        const check = findRecipes(inventory);
        if (!check.ok) {
          setLoading(false);
          setErr({ reason: check.reason, detail: check.detail });
          return;
        }
        recipe = getRecipe(inventory, session, history);
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
        {loading && <RecipeLoader />}
      </AnimatePresence>

      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Single linear column — no justify-between so sections stay grouped */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 pt-12 pb-4">
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
        <div className="flex-shrink-0 px-6 pb-safe pt-3 bg-bg-base border-t border-border-subtle">
          {err && (
            <div className="mb-4 rounded-xl bg-bg-surface border border-border-default p-4 space-y-3">
              <p className="text-[13px] font-semibold text-text-primary">
                {isProteinErr ? `No recipes found for ${inventory.proteins.join(", ")}` : "No recipes matched your kitchen"}
              </p>
              <p className="text-[12px] text-text-secondary leading-relaxed">{err.detail}</p>
              <div className="space-y-2 pt-1">
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
              </div>
            </div>
          )}

          <EmberButton size="lg" className="w-full" onClick={generate} disabled={loading}>
            Find me something <ArrowRight className="w-4 h-4" />
          </EmberButton>
        </div>{/* end sticky buttons */}
      </div>
    </MobileFrame>
  );
}
