import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { ArrowLeft, ArrowRight, X, Plus, Check, Drumstick, Carrot, Mic } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MobileFrame, useMobileFrame } from "@/components/mise/MobileFrame";
import { EmberButton } from "@/components/mise/EmberButton";
import { RecipeLoaderContent } from "@/components/mise/RecipeLoader";
import { useMise } from "@/store/mise";
import type { Inventory } from "@/store/mise";
import { getSlateFromAPI } from "@/lib/generate-recipe";
import { track } from "@/lib/analytics";
import { playRecipeReady, primeAudio } from "@/lib/sound";
import { hapticLight } from "@/lib/haptics";
import { sanitiseIngredient, extractKnownIngredients } from "@/lib/ingredient-parse";
import { useVoiceInput } from "@/lib/use-voice-input";
import { MASTER_INGREDIENTS } from "./inventory";

export const Route = createFileRoute("/dump")({ component: IngredientDump });

// The buckets that count as "things you want to cook with". Pantry staples and
// appliances are assumed on, so they aren't shown here as dumped chips.
const DUMP_CATS: (keyof Inventory)[] = ["proteins", "vegetables", "carbs", "fridge"];
// Unknown typed/spoken words are kept here so nothing the user says is silently
// lost — the kitchen screen lets them recategorise it later.
const FALLBACK_CAT: keyof Inventory = "fridge";

// One-tap starters so a blank screen teaches the interaction. Anchor types first.
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
  const setBatch = useMise((s) => s.setBatch);
  const recordShown = useMise((s) => s.recordShown);
  const recentlyShown = useMise((s) => s.recentlyShown);
  const history = useMise((s) => s.history);
  const session = useMise((s) => s.session);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<ErrState | null>(null);
  const [showAnchorHint, setShowAnchorHint] = useState(false);
  const [composer, setComposer] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);
  const [heard, setHeard] = useState("");
  const genIdRef = useRef(0);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // All final speech across the listening session, re-scanned as one so
  // ingredients spoken across pauses are all kept.
  const spokenRef = useRef("");

  // Everything dumped, flattened with its source category so a chip removes from
  // the right list. Pantry/appliances excluded.
  const dumped = DUMP_CATS.flatMap((cat) =>
    ((inventory[cat] as string[] | undefined) ?? []).map((item) => ({ cat, item }))
  );
  const anchorCount = inventory.proteins.length + inventory.vegetables.length;
  const hasAnchor = anchorCount > 0;

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

  // Add ingredients recognised in speech — master matches only, so filler words
  // ("I have", "some", "and") are dropped. Each new one appears as a chip live.
  const addRecognizedKeys = (keys: string[]) => {
    let added = 0;
    for (const key of keys) {
      const entry = MASTER_INGREDIENTS[key];
      if (!entry) continue;
      const cat = entry.category as keyof Inventory;
      const list = (useMise.getState().inventory[cat] as string[]) ?? [];
      if (list.map((x) => x.toLowerCase()).includes(key)) continue;
      const display = key.replace(/\b\w/g, (c) => c.toUpperCase());
      addCustomTokenMapping(key, entry.satToken);
      setInventory({ [cat]: [...list, display] } as never);
      addCustomItem(display);
      track("dump_ingredient_added", { item: key, category: cat, via: "voice" });
      added++;
    }
    if (added > 0) {
      hapticLight();
      setShowAnchorHint(false);
      showConfirm(added === 1 ? "Added 1 ingredient" : `Added ${added} ingredients`);
    }
  };

  // Voice: listen until the user taps stop; scan the running transcript for real
  // ingredients and add them. Unrecognised words are simply ignored.
  const { listening, start: startVoice, supported: voiceSupported } = useVoiceInput((text, isFinal) => {
    setHeard(text);
    if (!isFinal) return;
    spokenRef.current = (spokenRef.current + " " + text).trim();
    addRecognizedKeys(extractKnownIngredients(spokenRef.current));
  });
  const toggleVoice = () => {
    if (!listening) { spokenRef.current = ""; setHeard(""); track("dump_voice_started"); }
    startVoice();
  };

  useEffect(() => { track("dump_started"); }, []);
  useEffect(() => () => { if (confirmTimer.current) clearTimeout(confirmTimer.current); }, []);

  // Parse the composer's free text ("chicken, pasta, tomato" / "chicken and
  // rice") entirely on-device (no classify API — dump is $0 and instant). Known
  // words route to their true category; unknown words are kept as custom items
  // in the fridge bucket so nothing typed is lost.
  const addFromComposer = (raw: string) => {
    const parts = raw.split(/[,\n]|\s+and\s+/i).map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    let added = 0;
    let dupes = 0;
    for (const part of parts) {
      const clean = sanitiseIngredient(part);
      if (!clean) continue;
      const lower = clean.toLowerCase();
      const entry = MASTER_INGREDIENTS[lower];
      const cat = (entry?.category ?? FALLBACK_CAT) as keyof Inventory;
      const list = (useMise.getState().inventory[cat] as string[]) ?? [];
      if (list.map((x) => x.toLowerCase()).includes(lower)) { dupes++; continue; }
      if (entry) addCustomTokenMapping(lower, entry.satToken);
      setInventory({ [cat]: [...list, clean] } as never);
      addCustomItem(clean);
      track("dump_ingredient_added", { item: lower, category: cat, via: "composer" });
      added++;
    }
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
    const cat = (entry?.category ?? FALLBACK_CAT) as keyof Inventory;
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

    // Straight to recipes on sensible defaults — servings are chosen after.
    setSession({ vibes: [], cuisine: null });
    finalize();
    track("dump_generate_clicked", { ingredients: dumped.length });

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 58000);
      const SHOWN_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
      const recentShownNames = recentlyShown
        .filter((e) => Date.now() - e.ts < SHOWN_WINDOW_MS)
        .map((e) => e.name);
      const avoidRecipes = [...new Set([...history.map((h) => h.name), ...recentShownNames])].slice(0, 14);
      let slate: Awaited<ReturnType<typeof getSlateFromAPI>> | null = null;
      let apiFailure: "no_recipe" | "api_unreachable" | "paused" | null = null;
      try {
        slate = await getSlateFromAPI(inventory, session, controller.signal, avoidRecipes);
      } catch (apiErr) {
        const m = apiErr instanceof Error ? apiErr.message : "";
        apiFailure = m === "no_recipe" ? "no_recipe" : m === "paused" ? "paused" : "api_unreachable";
      } finally {
        clearTimeout(timeout);
      }

      if (genId !== genIdRef.current) return;

      if (!slate || slate.length === 0) {
        setLoading(false);
        setErr(
          apiFailure === "paused"
            ? { reason: "paused", detail: "Recipe generation is paused right now. Your kitchen is saved — check back soon." }
            : apiFailure === "no_recipe"
              ? { reason: "no_recipe", detail: "We couldn't make a good recipe from these right now. Try adding another ingredient or two." }
              : { reason: "api_unreachable", detail: "We couldn't reach the recipe kitchen. Check your connection and try again." }
        );
        return;
      }

      recordShown(slate.map((r) => r.name));
      setBatch(slate);
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
  const { keyboardOpen } = useMobileFrame();

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
          <button onClick={() => navigate({ to: "/setup" })} aria-label="Back"
            className="w-10 h-10 -ml-2 flex items-center justify-center text-text-secondary active:scale-90">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display text-[28px] font-light text-text-primary leading-tight mt-1">
            What do you want to cook with?
          </h1>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y px-6 pt-3 pb-4">
          <div className="rounded-2xl bg-bg-surface border border-border-default overflow-hidden shadow-[0_2px_14px_rgba(0,0,0,0.22)] mb-5">
            {/* Composer */}
            <div className="px-3.5 pt-3 pb-2.5 focus-within:bg-bg-raised/25 transition-colors">
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
                <span className={`text-[11px] truncate max-w-[200px] ${listening ? "text-ember-text font-medium" : "text-text-tertiary"}`}>
                  {listening
                    ? (heard ? `"${heard.length > 24 ? "…" + heard.slice(-24) : heard}"` : "Listening… tap mic to stop")
                    : voiceSupported ? "Speak or type · commas separate" : "Separate with commas"}
                </span>
                <div className="flex items-center gap-2">
                  {voiceSupported && (
                    <button
                      onClick={toggleVoice}
                      aria-label={listening ? "Stop voice input" : "Add ingredients by voice"}
                      aria-pressed={listening}
                      className={`relative w-10 h-10 rounded-full flex items-center justify-center border active:scale-90 transition ${
                        listening
                          ? "bg-ember-glow border-ember text-ember-text"
                          : "bg-bg-raised border-border-default text-text-secondary"
                      }`}
                    >
                      {listening && (
                        <motion.span
                          aria-hidden
                          animate={{ scale: [1, 1.35], opacity: [0.5, 0] }}
                          transition={{ duration: 1.1, repeat: Infinity, ease: "easeOut" }}
                          className="absolute inset-0 rounded-full border border-ember"
                        />
                      )}
                      <Mic className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={() => addFromComposer(composer)}
                    disabled={!composer.trim()}
                    aria-label="Add ingredients"
                    className="w-10 h-10 rounded-full flex items-center justify-center text-[color:var(--on-ember)] active:scale-90 disabled:opacity-40 transition"
                    style={{ background: "var(--ember-gradient)", boxShadow: "var(--shadow-button)" }}
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="h-px bg-border-subtle" />

            {/* Cooking with — the ingredients + protein/veg status */}
            <div className="px-3.5 py-3.5">
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">
                  Cooking with{dumped.length > 0 ? ` · ${dumped.length}` : ""}
                </p>
                <AnimatePresence mode="wait">
                  {confirm ? (
                    <motion.span key="confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="text-[11px] text-ember-text flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> {confirm}
                    </motion.span>
                  ) : dumped.length === 0 ? null : hasAnchor ? (
                    <motion.span key="ready" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="text-[11px] text-success flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Enough to cook
                    </motion.span>
                  ) : (
                    <motion.span key="need" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className={`text-[11px] flex items-center gap-1 ${showAnchorHint ? "text-ember-text font-medium" : "text-text-tertiary"}`}>
                      Add a protein or veg
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              {dumped.length > 0 ? (
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
              ) : (
                <div className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 transition-colors ${
                  showAnchorHint ? "border-ember bg-ember-glow" : "border-ember-dim bg-ember-glow"
                }`}>
                  <span className="flex-shrink-0 mt-0.5 flex gap-0.5">
                    <Drumstick className="w-4 h-4 text-ember-text" />
                    <Carrot className="w-4 h-4 text-ember-text" />
                  </span>
                  <p className="text-[12.5px] leading-snug text-text-primary">
                    Add a protein or a veg — that's the star we build the dish around. We'll assume the everyday pantry basics.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* One-tap starters */}
          {starters.length > 0 && (
            <div className="mb-2">
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
        </div>

        {/* CTA — hidden while typing so the content fits the visible area */}
        {!keyboardOpen && (
          <div className="flex-shrink-0 px-6 pt-3 pb-3 bg-bg-base border-t border-border-subtle">
            {err && (
              <div className="mb-3 rounded-xl bg-bg-surface border border-border-default p-4 space-y-1.5">
                <p className="text-[13px] font-semibold text-text-primary">
                  {err.reason === "paused" ? "Paused for maintenance"
                    : err.reason === "api_unreachable" ? "Couldn't reach the kitchen"
                    : "Couldn't find a recipe"}
                </p>
                <p className="text-[12px] text-text-secondary leading-relaxed">{err.detail}</p>
              </div>
            )}
            <EmberButton size="lg" className="w-full" onClick={generate} disabled={loading}>
              Find me a recipe <ArrowRight className="w-4 h-4" />
            </EmberButton>
            <p className="text-center text-[11px] text-text-tertiary leading-snug pt-2">
              Next: recipes from these — then pick how many you're cooking for.
            </p>
          </div>
        )}
      </div>
    </MobileFrame>
  );
}
