import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { ArrowLeft, ArrowRight, Clock, RotateCw, Bookmark, BookmarkCheck, Check, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MobileFrame } from "@/components/mise/MobileFrame";
import { KeyboardAwareFooter } from "@/components/mise/KeyboardAwareFooter";
import { EmberButton } from "@/components/mise/EmberButton";
import { RecipeImage } from "@/components/mise/RecipeImage";
import { RecipeLoaderContent } from "@/components/mise/RecipeLoader";
import { WhyThisDish } from "@/components/mise/WhyThisDish";
import { RecipePreview } from "@/components/mise/RecipePreview";
import { useMise } from "@/store/mise";
import { getRecipeFromAPI } from "@/lib/generate-recipe";
import { track } from "@/lib/analytics";
import { pickMealSlot, describeSlot, scheduleRecipeReminder, cancelRecipeReminder } from "@/lib/reminders";

export const Route = createFileRoute("/recipe")({ component: RecipeCard });


function RecipeCard() {
  const navigate = useNavigate();
  const recipe = useMise(s => s.recipe);
  const inventory = useMise(s => s.inventory);
  const session = useMise(s => s.session);
  const recipeBatch = useMise(s => s.recipeBatch);
  const batchIndex = useMise(s => s.batchIndex);
  const pushRecipe = useMise(s => s.pushRecipe);
  const appendToBatch = useMise(s => s.appendToBatch);
  const cycleRecipe = useMise(s => s.cycleRecipe);
  const history = useMise(s => s.history);
  const saved = useMise(s => s.saved);
  const saveRecipe = useMise(s => s.saveRecipe);
  const unsaveRecipe = useMise(s => s.unsaveRecipe);
  const backTo = "/session" as const;
  const [rerolling, setRerolling] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const saveToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSaved = !!recipe && saved.some(s => s.recipe.name === recipe.name);

  // Fire recipe_generated when a recipe is actually SHOWN (once per name). This
  // is where the metric lives now — so prefetched-but-unseen recipes don't count.
  const seenRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!recipe || seenRef.current.has(recipe.name)) return;
    seenRef.current.add(recipe.name);
    track("recipe_generated", {
      name: recipe.name,
      cuisine: recipe.cuisine,
      time_minutes: recipe.time_minutes,
      difficulty: recipe.difficulty,
      vibe: session.vibes?.[0] ?? "none",
      why_source: recipe.why ? "model" : "derived",
    });
  }, [recipe?.name]);

  // Background prefetch: while the user reads recipe 1, quietly generate the
  // next couple (one at a time) so "Not this" is instant. Silent — appended to
  // the batch without changing what's on screen. Best-effort; on-demand swap
  // covers any that don't arrive in time.
  const prefetchStarted = useRef(false);
  useEffect(() => {
    if (prefetchStarted.current) return;
    prefetchStarted.current = true;
    (async () => {
      while (useMise.getState().recipeBatch.length < 3) {
        const batch = useMise.getState().recipeBatch;
        if (batch.length === 0) break;
        const avoid = [...new Set([...batch.map(r => r.name), ...history.map(h => h.name)])];
        try {
          const controller = new AbortController();
          const t = setTimeout(() => controller.abort(), 58000);
          let next: any = null;
          try {
            next = await getRecipeFromAPI(inventory, session, controller.signal, batch[batch.length - 1].name, avoid);
          } finally { clearTimeout(t); }
          if (!next) break;
          appendToBatch(next);
        } catch {
          break; // prefetch failed — leave it; on-demand swap will handle later
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openWhy = () => {
    if (!recipe) return;
    setWhyOpen(true);
    track("why_this_dish_opened", {
      recipe: recipe.name,
      cuisine: recipe.cuisine,
      source: recipe.why?.reasons?.length ? "model" : "derived",
    });
  };

  // One live toast at a time — reset the dismiss timer on each call so a
  // rapid save/unsave can't have an older timer clear the newer message.
  const showSaveToast = (msg: string) => {
    setSaveToast(msg);
    if (saveToastTimer.current) clearTimeout(saveToastTimer.current);
    saveToastTimer.current = setTimeout(() => setSaveToast(null), 3375);
  };

  const toggleSave = async () => {
    if (!recipe) return;
    if (isSaved) {
      unsaveRecipe(recipe.name);
      cancelRecipeReminder(recipe.name);
      showSaveToast("Removed from your cookbook");
      return;
    }
    const slot = pickMealSlot(recipe);
    saveRecipe({ recipe, savedAt: Date.now(), cookAt: slot.cookAt, meal: slot.meal });
    track("recipe_saved", { name: recipe.name, cuisine: recipe.cuisine });
    // Saved is certain; only promise a reminder if scheduling actually succeeds.
    showSaveToast("Saved to your cookbook");
    const res = await scheduleRecipeReminder(recipe.name, slot.meal, slot.cookAt);
    if (res.ok) showSaveToast(`Saved — we'll remind you ${describeSlot(slot)}`);
  };

  if (!recipe) {
    return (
      <MobileFrame>
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
          <p className="text-text-secondary text-[15px] text-center">No recipe loaded.</p>
          <button onClick={() => navigate({ to: backTo })}
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

  const swap = async () => {
    setErrMsg(null);

    // The next recipe is already available — either prefetched into the batch,
    // or we've filled all 3 and are looping. Advance instantly, no API call.
    if (batchIndex + 1 < recipeBatch.length || recipeBatch.length >= 3) {
      cycleRecipe();
      return;
    }

    // Otherwise generate the next one on demand (prefetch hasn't caught up yet).
    setRerolling(true);
    let next = null;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 58000);
      // Don't repeat anything already in the batch (or recently cooked dishes).
      const avoidRecipes = [...new Set([
        ...recipeBatch.map(r => r.name),
        ...history.map(h => h.name),
      ])];
      let apiFailure: "no_recipe" | "api_unreachable" | null = null;
      try {
        next = await getRecipeFromAPI(inventory, session, controller.signal, recipe.name, avoidRecipes);
      } catch (apiErr) {
        const m = apiErr instanceof Error ? apiErr.message : "";
        apiFailure = m === "no_recipe" ? "no_recipe" : "api_unreachable";
      } finally {
        clearTimeout(timeout);
      }

      // Honest failure — keep the current recipe and say so, never a random one.
      if (!next) {
        // If the kitchen genuinely can't yield another distinct dish but we
        // already have a couple, don't dead-end — loop the ones we have.
        if (apiFailure === "no_recipe" && recipeBatch.length >= 2) {
          cycleRecipe();
          return;
        }
        setErrMsg(
          apiFailure === "no_recipe"
            ? "We couldn't find a different recipe for these ingredients right now. Try updating your kitchen."
            : "Couldn't reach the recipe kitchen. Check your connection and try again."
        );
        return;
      }

      pushRecipe(next);
    } catch (e: any) {
      const reason = (e.message ?? "").split("|")[0];
      if (reason === "no_more_recipes") {
        setErrMsg("You've seen all recipes for your kitchen. Add more ingredients to unlock new options.");
      } else {
        setErrMsg("Couldn't find another recipe. Try adjusting your kitchen.");
      }
    } finally {
      setRerolling(false);
    }
  };

  return (
    <MobileFrame>
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Save confirmation toast — anchored to the bottom, near the thumb */}
        <AnimatePresence>
          {saveToast && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="absolute bottom-32 inset-x-6 z-50 rounded-2xl bg-bg-base/95 backdrop-blur-md border border-ember-dim shadow-lg px-3.5 py-2.5 flex items-center gap-2.5"
            >
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-ember-glow flex items-center justify-center">
                <BookmarkCheck className="w-4 h-4 text-ember-text" />
              </span>
              <p className="text-[13px] text-text-primary leading-snug">{saveToast}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-shrink-0 px-4 pt-5 pb-2">
          <button onClick={() => navigate({ to: backTo })}
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
          {rerolling && <RecipeLoaderContent subtitle="" />}
        </motion.div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <motion.div key={recipe.name}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="px-4 space-y-4 pt-2 pb-4">

          {/* Recipe card */}
          <div className="rounded-xl overflow-hidden bg-bg-surface border border-border-subtle">
            {/* Photo — compact banner so the recipe preview stays in view */}
            <RecipeImage src={recipe.image} cuisine={recipe.cuisine} alt={recipe.name} height={180} />

            <div className="p-4 space-y-2.5">
              {/* Metadata row shares the top line with the save action, so the
                  title & description below get the full card width. */}
              <div className="flex items-start justify-between gap-3">
                {/* Tier 1 — category + time metadata (eyebrow) */}
                <div className="flex gap-2 flex-wrap min-w-0">
                  <span className="bg-ember-glow text-ember-text text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full">
                    {recipe.cuisine}
                  </span>
                  <span className="bg-bg-elevated text-text-secondary text-[10px] font-mono px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Clock className="w-3 h-3" />{recipe.time_minutes} min
                  </span>
                </div>
                {/* Frameless save action — flips to a ticked "Recipe saved". */}
                <button
                  onClick={toggleSave}
                  aria-pressed={isSaved}
                  className={`flex-shrink-0 flex items-center gap-1.5 text-[13px] font-medium active:opacity-60 transition ${
                    isSaved ? "text-ember-text" : "text-text-secondary"
                  }`}
                >
                  {isSaved ? (
                    <><Check className="w-4 h-4" /> Recipe saved</>
                  ) : (
                    <><Bookmark className="w-4 h-4" /> Save for later</>
                  )}
                </button>
              </div>
              {/* Tier 2 — the hero title, full width */}
              <h2 className="font-display text-[22px] font-normal text-text-primary leading-[1.12] tracking-tight">
                {recipe.name}
              </h2>
              {/* Tier 3 — supporting caption */}
              <p className="text-[13px] text-text-tertiary leading-relaxed">{recipe.description}</p>

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
                  {optional.join(", ")} not needed. The dish works fine without {optional.length === 1 ? "it" : "them"}.
                </p>
              )}

              {/* Match status — sits at the bottom of the card */}
              {allGood && (
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className="text-success">✓</span>
                  <span className="text-[12px] text-success font-medium">You have everything</span>
                </div>
              )}
            </div>
          </div>

          {/* Why this dish — inline trigger, styled like the preview row so it
              never overlaps the CTAs or the dropdown below it. */}
          <button
            onClick={openWhy}
            className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl bg-bg-surface border border-border-subtle active:opacity-70 transition-opacity"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-ember-text" />
              <span className="text-[13px] font-medium text-text-primary">Why this dish?</span>
            </span>
            <span className="text-[11px] text-text-tertiary">See the match →</span>
          </button>

          {/* Recipe preview — opens the read-ahead sheet (same style as the
              "Why this dish?" sheet), not an inline dropdown. */}
          <button
            onClick={() => setPreviewOpen(true)}
            className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl bg-bg-surface border border-border-subtle active:opacity-70 transition-opacity"
          >
            <span className="flex items-center gap-2">
              <span className="text-base">📋</span>
              <span className="text-[13px] font-medium text-text-primary">See the full recipe</span>
            </span>
            <span className="text-[11px] text-text-tertiary">{recipe.steps?.length ?? 0} steps →</span>
          </button>

          {errMsg && (
            <div className="rounded-xl bg-bg-surface border border-border-default p-4 text-center space-y-2">
              <p className="text-[13px] text-text-secondary">{errMsg}</p>
              <button
                onClick={() => navigate({ to: "/inventory" })}
                className="text-[12px] font-semibold text-ember underline underline-offset-2 active:opacity-70"
              >
                Update my kitchen →
              </button>
            </div>
          )}
        </motion.div>
        </div>{/* end scroll */}

        {/* Sticky bottom CTAs — always visible */}
        <KeyboardAwareFooter className="space-y-2">
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
            <button onClick={() => navigate({ to: backTo })}
              className="w-full text-center text-[12px] text-text-tertiary py-1 active:opacity-70">
              These swaps don't work for me. Try a different recipe.
            </button>
          )}
          <p className="text-center text-[10px] text-text-tertiary leading-snug pt-0.5">
            AI-generated recipe — double-check cooking times, doneness &amp; allergens.
          </p>
        </KeyboardAwareFooter>

        {/* "Why this dish?" sheet — opened by the inline trigger above */}
        <WhyThisDish recipe={recipe} inventory={inventory} open={whyOpen} onClose={() => setWhyOpen(false)} />

        {/* Read-ahead preview sheet — opened by the "Preview the steps" row. */}
        <RecipePreview recipe={recipe} open={previewOpen} onClose={() => setPreviewOpen(false)} />
      </div>
    </MobileFrame>
  );
}
