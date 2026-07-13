import type { Recipe, Inventory } from "@/store/mise";

// The "Why this dish" reasoning shown on the recipe screen. Everything here is
// DERIVED from the recipe + the user's kitchen — no AI call, no stored field,
// so it works offline and can never contradict what's on screen. Reasons are
// honest facts about the match; the three meters summarise them at a glance.

export type Meter = "Low" | "Medium" | "High";

export type WhyThisDish = {
  reasons: string[];
  completion: Meter; // how much of it you can make from your kitchen
  effort: Meter;     // how hard it is to get right
  tasteNote: string; // a short sentence on how it actually tastes
  flavourRationale?: string; // why the ingredients belong together
  provenance?: "classic" | "adapted" | "original";
};

// Flavour cues → the descriptor they contribute to the taste note. Matched
// against the dish's ingredient names to build an honest "how it tastes" line.
const FLAVOUR_NOTES: { hints: string[]; note: string }[] = [
  { hints: ["chilli", "chili", "cayenne", "chipotle", "harissa"], note: "a gentle chilli warmth" },
  { hints: ["garlic"], note: "a garlicky depth" },
  { hints: ["ginger"], note: "a fresh ginger kick" },
  { hints: ["lemon", "lime", "vinegar", "tamarind"], note: "a bright, tangy lift" },
  { hints: ["soy", "miso", "worcestershire", "fish sauce", "parmesan"], note: "deep savoury umami" },
  { hints: ["cheese", "cream", "butter"], note: "a rich, creamy finish" },
  { hints: ["basil", "coriander", "cilantro", "thyme", "rosemary", "oregano", "parsley", "mint"], note: "fresh herby notes" },
  { hints: ["cumin", "paprika", "curry", "garam", "turmeric", "coriander seed"], note: "warm, toasty spice" },
  { hints: ["honey", "sugar", "maple"], note: "a touch of sweetness" },
  { hints: ["smoked", "bacon", "chorizo"], note: "a smoky savoury edge" },
];

const meterFromScore = (n: number, mid: number, hi: number): Meter =>
  n >= hi ? "High" : n >= mid ? "Medium" : "Low";

// Pick the "hero" the dish leans on: the first essential ingredient the user
// already has, falling back to any ingredient they have. Used for "Uses your …".
function heroIngredient(recipe: Recipe): string | null {
  const have = recipe.ingredients?.filter(i => i.inInventory !== false) ?? [];
  const essential = have.find(i => i.criticality === "essential");
  return (essential ?? have[0])?.name?.toLowerCase() ?? null;
}

export function whyThisDish(recipe: Recipe, inventory: Inventory): WhyThisDish {
  const ingredients = recipe.ingredients ?? [];
  const swaps = recipe.requiredSwaps ?? [];
  const optional = recipe.optionalMissing ?? [];
  const haveCount = ingredients.filter(i => i.inInventory !== false).length;
  const total = Math.max(1, ingredients.length);
  const haveRatio = haveCount / total;

  const reasons: string[] = [];

  // 1. What it leans on from your kitchen.
  const hero = heroIngredient(recipe);
  if (hero) reasons.push(`Uses your ${hero}`);

  // 2. Fresh-first framing — Mise's whole point is cooking things before they spoil.
  const perishables = [...(inventory.vegetables ?? []), ...(inventory.fridge ?? [])];
  if (perishables.length > 0) {
    reasons.push("Helps you use things up before they turn");
  }

  // 3. Honest read on missing items.
  if (swaps.length > 0) {
    reasons.push("Works with simple swaps for anything you're missing");
  } else if (optional.length > 0) {
    reasons.push("A couple of extras are optional — it works without them");
  } else {
    reasons.push("You already have everything it needs");
  }

  // 4. Confidence for a first-timer.
  if (recipe.difficulty <= 1) {
    reasons.push("Low effort and hard to get wrong");
  } else if ((recipe.steps?.length ?? 0) <= 6) {
    reasons.push("Just a few clear steps to follow");
  }

  // ── Meters ────────────────────────────────────────────────────────────────
  // Completion — how ready your kitchen is. Penalise required swaps harder than
  // missing optionals.
  const completion: Meter =
    swaps.length === 0 && optional.length === 0
      ? "High"
      : swaps.length <= 1 && haveRatio >= 0.6
        ? "Medium"
        : "Low";

  // Effort — difficulty (1–3) is the primary signal, nudged by cook time.
  const effortScore = recipe.difficulty + (recipe.time_minutes > 45 ? 0.5 : 0);
  const effort: Meter = meterFromScore(effortScore, 2, 2.75);

  // Taste — an honest sentence on how it eats, built from the flavour cues the
  // dish actually contains (not a meaningless "Medium").
  const names = ingredients.map(i => i.name.toLowerCase());
  const detected = FLAVOUR_NOTES
    .filter(f => f.hints.some(h => names.some(name => name.includes(h))))
    .map(f => f.note);
  const tasteNote = composeTasteNote(recipe.cuisine, detected);

  // A modest flavour rationale from the cuisine + detected cues (the model gives
  // a much richer one; this is the offline/older-recipe fallback). Reuses `hero`.
  const rationaleBits: string[] = [];
  if (hero) rationaleBits.push(`built around your ${hero}`);
  if (detected.length) rationaleBits.push(`with ${detected.slice(0, 2).join(" and ")}`);
  const flavourRationale = rationaleBits.length
    ? `A ${recipe.cuisine} dish ${rationaleBits.join(" ")} — ingredients chosen to share one flavour direction rather than clash.`
    : undefined;

  return { reasons, completion, effort, tasteNote, flavourRationale };
}

// Join up to two detected flavour notes into a natural sentence, prefixed with
// the cuisine. Falls back to a warm, honest default when nothing stands out.
function composeTasteNote(cuisine: string | undefined, notes: string[]): string {
  const lead = cuisine ? `${cuisine.trim()} flavours` : "Comforting and savoury";
  if (notes.length === 0) return `${lead} — warm, savoury and satisfying.`;
  const picked = notes.slice(0, 2);
  const joined = picked.length === 2 ? `${picked[0]} with ${picked[1]}` : picked[0];
  return `${lead} — ${joined}.`;
}
