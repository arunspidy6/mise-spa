import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { ArrowLeft, ArrowRight, ArrowUp, X, Plus, Sparkles, ChevronDown, Check, Drumstick, Carrot } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MobileFrame } from "@/components/mise/MobileFrame";
import { KeyboardAwareFooter } from "@/components/mise/KeyboardAwareFooter";
import { EmberButton } from "@/components/mise/EmberButton";
import { RecipeLoaderContent } from "@/components/mise/RecipeLoader";
import { useMise } from "@/store/mise";
import type { Inventory } from "@/store/mise";
import { getRecipeFromAPI } from "@/lib/generate-recipe";
import { track } from "@/lib/analytics";
import { playRecipeReady, primeAudio } from "@/lib/sound";
import { hapticLight } from "@/lib/haptics";
import { classifyIngredient, sanitiseIngredient } from "@/lib/classify-ingredient";
import { MASTER_INGREDIENTS } from "./inventory";

export const Route = createFileRoute("/dump")({ component: IngredientDump });

// The ingredient buckets that count as "things you want to cook with" — pantry
// staples (salt, oil, spices) and appliances are assumed/separate, so they're
// not shown as dumped items.
const DUMP_CATS: (keyof Inventory)[] = ["proteins", "vegetables", "carbs", "fridge"];
const VALID_CATS = ["proteins", "carbs", "vegetables", "fridge", "staples"];

// One-tap starters so a blank screen teaches the interaction. Each is a known
// ingredient (correct category + satToken), anchor types first.
const STARTERS = ["Chicken breast", "Eggs", "Tomatoes", "Broccoli", "Pasta", "Rice", "Cheddar"];

type ErrState = { reason: string; detail: string };

function IngredientDump() {
  const navigate = useNavigate();
  const inventory = useMise((s) => s.inventory);
  const setInventory = useMise((s) => s.setInventory);
  const finalize = useMise((s) => s.finalizeInventory);
  const addCustomItem = useMise((s) => s.addCustomItem);
  const addCustomTokenMapping = useMise((s) => s.addCustomTokenMapping);
  const setSession = useMise((s) => s.setSession);
  const setRecipe = useMise((s) => s.setRecipe);
  const history = useMise((s) => s.history);
  const session = useMise((s) => s.session);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<ErrState | null>(null);
  const [showAnchorHint, setShowAnchorHint] = useState(false);
  const [pantryOpen, setPantryOpen] = useState(false);
  const [composer, setComposer] = useState("");
  const [adding, setAdding] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);
  const genIdRef = useRef(0);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { track("dump_started"); }, []);
  useEffect(() => () => { if (confirmTimer.current) clearTimeout(confirmTimer.current); }, []);

  // Everything the user has dumped, flattened with its source category so a chip
  // can be removed from the right list. Pantry/appliances are excluded.
  const dumped = DUMP_CATS.flatMap((cat) =>
    ((inventory[cat] as string[] | undefined) ?? []).map((item) => ({ cat, item }))
  );
  const anchorCount = inventory.proteins.length + inventory.vegetables.length;

  const showConfirm = (text: string) => {
    setConfirm(text);
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    confirmTimer.current = setTimeout(() => setConfirm(null), 2400);
  };

  const removeItem = (cat: keyof Inventory, item: string) => {
    hapticLight();
    const list = (inventory[cat] as string[]) ?? [];
    setInventory({ [cat]: list.filter((x) => x !== item) } as never);
  };

  // Parse the composer's free text ("chicken, pasta, tomato" / "chicken and
  // rice") and add each item to its true category. Reads the live store between
  // adds so a batch dedupes correctly across awaits.
  const addFromComposer = async (raw: string) => {
    const parts = raw.split(/[,\n]|\s+and\s+/i).map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    setAdding(true);
    let added = 0;
    let dupes = 0;
    for (const part of parts) {
      const clean = sanitiseIngredient(part);
      if (!clean) continue;
      const lower = clean.toLowerCase();
      const cls = await classifyIngredient(clean);
      const cat = ((cls.category && VALID_CATS.includes(cls.category) ? cls.category : "fridge")) as keyof Inventory;
      const list = (useMise.getState().inventory[cat] as string[]) ?? [];
      if (list.map((x) => x.toLowerCase()).includes(lower)) { dupes++; continue; }
      if (cls.satToken) addCustomTokenMapping(lower, cls.satToken);
      setInventory({ [cat]: [...list, clean] } as never);
      addCustomItem(clean);
      track("dump_ingredient_added", { item: lower, category: cat, via: "composer" });
      added++;
    }
    setAdding(false);
    setComposer("");
    setShowAnchorHint(false);
    if (added > 0) {
      hapticLight();
      showConfirm(added === 1 ? "Added 1 ingredient" : `Added ${added} ingredients`);
    } else if (dupes > 0) {
      showConfirm("Already in your list");
    }
  };

  const addStarter = (item: string) => {
    const lower = item.toLowerCase();
    const entry = MASTER_INGREDIENTS[lower];
    const cat = (entry?.category ?? "fridge") as keyof Inventory;
    const list = (inventory[cat] as string[]) ?? [];
    if (list.map((x) => x.toLowerCase()).includes(lower)) return;
    if (entry) addCustomTokenMapping(lower, entry.satToken);
    setInventory({ [cat]: [...list, item] } as never);
    addCustomItem(item);
    setShowAnchorHint(false);
    hapticLight();
    track("dump_ingredient_added", { item: lower, category: cat, via: "starter" });
  };

  const generate = async () => {
    // Soft gate: a good recipe needs a hero. Nudge (don't hard-block) until
    // there's at least one protein or vegetable to build the dish around.
    if (anchorCount === 0) {
      setShowAnchorHint(true);
      track("dump_blocked_no_anchor");
      return;
    }

    const genId = ++genIdRef.current;
    primeAudio();
    setLoading(true);
    setErr(null);

    // Straight to a recipe with sensible defaults — servings are asked for
    // *after* the recipe is shown (on the recipe screen), not up front.
    setSession({ vibes: [], cuisine: null });
    finalize();
    track("dump_generate_clicked", { ingredients: dumped.length });

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 58000);
      const avoidRecipes = [...new Set(history.map((h) => h.name))].slice(0, 8);
      let recipe = null;
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

      if (!recipe) {
        setLoading(false);
        setErr(
          apiFailure === "no_recipe"
            ? { reason: "no_recipe", detail: "We couldn't make a good recipe from these right now. Try adding another ingredient or two." }
            : { reason: "api_unreachable", detail: "We couldn't reach the recipe kitchen. Check your connection and try again." }
        );
        return;
      }

      setRecipe(recipe);
      playRecipeReady();
      navigate({ to: "/recipe" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown";
      const parts = msg.split("|");
      setErr({ reason: parts[0], detail: parts[1] ?? "Something went wrong." });
    } finally {
      if (genId === genIdRef.current) setLoading(false);
    }
  };

  const starters = STARTERS.filter(
    (s) => !dumped.some((d) => d.item.toLowerCase() === s.toLowerCase())
  );
  const hasAnchor = anchorCount > 0;

  return (
    <MobileFrame>
      <AnimatePresence>
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-bg-base z-50 flex items-center justify-center">
            <RecipeLoaderContent />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 px-6 pt-5">
          <button onClick={() => navigate({ to: "/" })}
            className="w-10 h-10 -ml-2 flex items-center justify-center text-text-secondary active:scale-90">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display text-[30px] font-light text-text-primary leading-tight mt-2">
            What do you want to cook with?
          </h1>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 pt-3 pb-4">
          {/* Guidance — the one thing to know before typing: a dish is built
              around a protein or a veg. Flips to a confirmation once satisfied. */}
          <div className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 mb-3 transition-colors ${
            hasAnchor ? "border-success/40 bg-success/10" : "border-ember-dim bg-ember-glow"
          }`}>
            {hasAnchor ? (
              <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
            ) : (
              <span className="flex-shrink-0 mt-0.5 flex gap-0.5">
                <Drumstick className="w-4 h-4 text-ember-text" />
                <Carrot className="w-4 h-4 text-ember-text" />
              </span>
            )}
            <p className={`text-[12.5px] leading-snug ${hasAnchor ? "text-text-secondary" : "text-text-primary"}`}>
              {hasAnchor
                ? "Nice — that's enough to build a dish. Add anything else, then find your recipe."
                : "A good recipe is built around a protein or a veg. Add those first — we'll assume the everyday pantry basics."}
            </p>
          </div>

          {/* LLM-style composer — the hero input. Type several at once. */}
          <div className="rounded-2xl bg-bg-surface border border-border-default focus-within:border-ember transition-colors px-3.5 pt-3 pb-2.5 shadow-[0_2px_14px_rgba(0,0,0,0.22)]">
            <textarea
              value={composer}
              onChange={(e) => setComposer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addFromComposer(composer); }
              }}
              placeholder="Enter chicken, pasta, tomato…"
              rows={2}
              maxLength={200}
              autoCapitalize="none"
              className="w-full bg-transparent resize-none text-[16px] text-text-primary placeholder:text-text-tertiary focus:outline-none leading-relaxed"
            />
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-text-tertiary">Separate with commas</span>
              <button
                onClick={() => addFromComposer(composer)}
                disabled={adding || !composer.trim()}
                aria-label="Add ingredients"
                className="w-10 h-10 rounded-full flex items-center justify-center text-[color:var(--on-ember)] active:scale-90 disabled:opacity-40 transition"
                style={{ background: "var(--ember-gradient)", boxShadow: "var(--shadow-button)" }}
              >
                {adding ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ArrowUp className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Add confirmation / anchor nudge — one live line under the composer */}
          <div className="min-h-[20px] mt-2">
            <AnimatePresence mode="wait">
              {showAnchorHint && !hasAnchor ? (
                <motion.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-[12px] text-ember-text font-medium px-1">
                  Add at least one protein or veg to continue.
                </motion.p>
              ) : confirm ? (
                <motion.p key="confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-[12px] text-text-secondary px-1 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-ember-text" /> {confirm}
                </motion.p>
              ) : null}
            </AnimatePresence>
          </div>

          {/* Your ingredients */}
          {dumped.length > 0 && (
            <div className="mt-3 mb-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-tertiary mb-2.5">
                Cooking with · {dumped.length}
              </p>
              <div className="flex flex-wrap gap-2">
                {dumped.map(({ cat, item }) => (
                  <button
                    key={`${cat}:${item}`}
                    onClick={() => removeItem(cat, item)}
                    aria-label={`Remove ${item}`}
                    className="inline-flex items-center gap-1.5 h-10 pl-4 pr-3 rounded-full text-[13px] font-medium border transition-all active:scale-[0.94]"
                    style={{
                      background: "var(--ember-chip)",
                      borderColor: "var(--ember-chip)",
                      color: "oklch(0.965 0.018 72)",
                      boxShadow: "0 2px 8px oklch(0 0 0 / 0.28)",
                    }}
                  >
                    {item}
                    <X className="w-3.5 h-3.5 opacity-80" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* One-tap starters */}
          {starters.length > 0 && (
            <div className={dumped.length > 0 ? "mb-5" : "mt-5 mb-5"}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-tertiary mb-2.5">
                {dumped.length > 0 ? "Quick add" : "Or tap to add"}
              </p>
              <div className="flex flex-wrap gap-2">
                {starters.map((s) => (
                  <button
                    key={s}
                    onClick={() => addStarter(s)}
                    aria-label={`Add ${s}`}
                    className="inline-flex items-center gap-1.5 h-10 pl-2.5 pr-4 rounded-full text-[13px] font-medium bg-bg-elevated border border-border-default text-text-secondary active:scale-[0.94] transition-all"
                  >
                    <Plus className="w-3.5 h-3.5 text-ember-text" />
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Pantry transparency — we assume these basics; show exactly which. */}
          <div className="mt-2 rounded-xl bg-bg-surface border border-border-subtle overflow-hidden">
            <button
              onClick={() => setPantryOpen((o) => !o)}
              aria-expanded={pantryOpen}
              className="w-full flex items-center gap-3 px-4 py-3 text-left active:opacity-70 transition"
            >
              <span className="w-8 h-8 rounded-lg bg-ember-glow flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-ember-text" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-medium text-text-primary leading-tight">
                  Pantry basics included
                </span>
                <span className="block text-[12px] text-text-tertiary leading-tight mt-0.5">
                  We assume you've got the everyday staples — no need to add them.
                </span>
              </span>
              <ChevronDown className={`w-4 h-4 text-text-tertiary flex-shrink-0 transition-transform ${pantryOpen ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {pantryOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22 }} className="overflow-hidden"
                >
                  <div className="px-4 pb-3.5 pt-0.5 flex flex-wrap gap-1.5">
                    {(inventory.staples ?? []).map((s) => (
                      <span key={s} className="inline-flex items-center h-7 px-2.5 rounded-full bg-bg-elevated border border-border-subtle text-[11px] text-text-secondary">
                        {s}
                      </span>
                    ))}
                    <button
                      onClick={() => navigate({ to: "/kitchen", search: { from: "session" } })}
                      className="inline-flex items-center h-7 px-2.5 rounded-full border border-ember-dim text-[11px] font-medium text-ember-text active:opacity-70"
                    >
                      Edit pantry →
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* CTA */}
        <KeyboardAwareFooter className="px-6">
          {err && (
            <div className="mb-4 rounded-xl bg-bg-surface border border-border-default p-4 space-y-1.5">
              <p className="text-[13px] font-semibold text-text-primary">
                {err.reason === "api_unreachable" ? "Couldn't reach the kitchen" : "Couldn't find a recipe"}
              </p>
              <p className="text-[12px] text-text-secondary leading-relaxed">{err.detail}</p>
            </div>
          )}
          <EmberButton size="lg" className="w-full" onClick={generate} disabled={loading}>
            Find me a recipe <ArrowRight className="w-4 h-4" />
          </EmberButton>
          <p className="text-center text-[11px] text-text-tertiary leading-snug pt-2">
            Next: we'll create one recipe from these — then you pick how many you're cooking for.
          </p>
        </KeyboardAwareFooter>
      </div>
    </MobileFrame>
  );
}
