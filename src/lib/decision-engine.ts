// ── Layer 3 + 5: Recommendation engine & recipe adaptation ───────────────────
// This is the brain of the decision assistant. It does NOT browse recipes. It:
//   1. turns the user's urgent list + intent into a scoring context
//   2. asks findRecipes() to generate candidates, drop infeasible dishes, and
//      rank the rest (ingredient usage, waste reduction, effort, flavour,
//      preference, novelty)
//   3. returns ONE best meal + at most two alternatives
//   4. attaches the confidence read-out (completion / effort / taste) and the
//      "why this meal" reasoning the hero screen shows
//   5. flags when the best we can do is missing an essential (→ Screen 4)
//
// Novelty can reorder candidates but can never resurrect an infeasible dish or
// override taste/effort — feasibility and confidence come first, always.
import type { Recipe, UrgentIngredient, Intent, CookSize } from "@/store/mise";
import { findRecipes, buildRecipe, userHas, type Match, type CookHistory } from "./generate-recipe";
import { buildEngineInventory, groupIngredients, type IngredientGroups } from "./pantry-model";
import { STAPLES_DEFAULTS } from "./mise-data";

export type ConfidenceLevel = "High" | "Medium" | "Low";

export type DecisionMeal = {
  recipe: Recipe;
  groups: IngredientGroups;
  completion: ConfidenceLevel;   // will it actually come together?
  effort: ConfidenceLevel;       // Low = easy tonight
  taste: ConfidenceLevel;        // will they enjoy it?
  why: string[];                 // "Why this meal" bullets
};

export type DecisionResult = {
  best: DecisionMeal;
  alternatives: DecisionMeal[];  // ≤ 2
  needsAdjust: boolean;          // best dish is missing an essential → Screen 4
  missingEssential: string[];    // labels of the missing essentials, if any
};

// ── Intent → engine session ──────────────────────────────────────────────────
const SIZE_SERVINGS: Record<CookSize, number> = { "1": 1, "2": 2, family: 4, "meal-prep": 4 };

export function intentToSession(intent: Intent) {
  const servings = SIZE_SERVINGS[intent.size] ?? 2;
  // Priority nudges the time budget + flavour "vibes" the engine can lean on.
  let timeMinutes = 45;
  const vibes: string[] = [];
  switch (intent.priority) {
    case "quick": timeMinutes = 20; vibes.push("quick", "weeknight"); break;
    case "comfort": timeMinutes = 60; vibes.push("comfort"); break;
    case "healthy": timeMinutes = 40; vibes.push("healthy", "vegetarian"); break;
    case "different": timeMinutes = 50; vibes.push("adventurous"); break;
    case "use-up": default: timeMinutes = 50; vibes.push("use-up"); break;
  }
  return { timeMinutes, servings, cuisine: null, vibes };
}

// ── Confidence read-out ──────────────────────────────────────────────────────
function completionConfidence(recipe: Recipe): ConfidenceLevel {
  if (recipe.sparseFallback) return "Low";
  const swaps = recipe.requiredSwaps?.length ?? 0;
  if (swaps === 0) return "High";
  if (swaps <= 1) return "Medium";
  return "Low";
}

function effortLevel(recipe: Recipe): ConfidenceLevel {
  // Low effort is the *good* outcome, so we invert difficulty/time. Effort tracks
  // hands-on difficulty more than total time — a hands-off tray bake that roasts
  // for an hour is still low effort.
  const t = recipe.time_minutes ?? 40;
  const d = recipe.difficulty ?? 2;
  if (d <= 1 && t <= 60) return "Low";
  if (d >= 3 || t > 75) return "High";
  return "Medium";
}

function tasteConfidence(recipe: Recipe): ConfidenceLevel {
  const pct = recipe.matchPercent ?? 0.6;         // 0..1 coverage-weighted score
  const swaps = recipe.requiredSwaps?.length ?? 0;
  if (pct >= 0.7 && swaps === 0) return "High";
  if (pct >= 0.45) return "Medium";
  return "Low";
}

// ── "Why this meal" reasoning ─────────────────────────────────────────────────
function buildWhy(recipe: Recipe, groups: IngredientGroups, intent: Intent): string[] {
  const why: string[] = [];
  const used = groups.available.slice(0, 3);
  if (used.length) {
    why.push(`Uses your ${used.join(", ").replace(/, ([^,]*)$/, " and $1").toLowerCase()}`);
  }
  if (intent.priority === "use-up") why.push("Helps you use things up before they turn");
  else why.push("Makes the most of what you already have");

  const noSwaps = (recipe.requiredSwaps?.length ?? 0) === 0;
  if (noSwaps) why.push("Needs only basic pantry staples — no shopping");
  else why.push("Works with simple swaps for anything you're missing");

  if (effortLevel(recipe) === "Low") why.push("Low effort and hard to get wrong");
  else why.push("A reliable result for the time you've got");

  return why.slice(0, 4);
}

function toMeal(match: Match, session: ReturnType<typeof intentToSession>, urgent: UrgentIngredient[], intent: Intent, sparse: boolean): DecisionMeal {
  const recipe = buildRecipe(match, session, sparse);
  const groups = groupIngredients(recipe, urgent);
  return {
    recipe,
    groups,
    completion: completionConfidence(recipe),
    effort: effortLevel(recipe),
    taste: tasteConfidence(recipe),
    why: buildWhy(recipe, groups, intent),
  };
}

// Which essential reqs of a template the user can't cover — used to explain the
// adjust screen ("this needs pasta, and you don't have any").
function missingEssentials(match: Match, urgent: UrgentIngredient[]): string[] {
  const items = [
    ...urgent.map(u => u.name.toLowerCase().trim()),
    ...STAPLES_DEFAULTS.map(s => s.toLowerCase().trim()),
  ];
  return match.template.reqs
    .filter(r => r.criticality === "essential" && !userHas(r.token, items))
    .map(r => r.label);
}

// ── The decision ─────────────────────────────────────────────────────────────
export function decide(urgent: UrgentIngredient[], intent: Intent, history: CookHistory = []): DecisionResult | null {
  const inventory = buildEngineInventory(urgent);
  const session = intentToSession(intent);
  const result = findRecipes(inventory, history);
  if (!result.ok || result.matches.length === 0) return null;

  const { matches, sparse } = result;
  const best = toMeal(matches[0], session, urgent, intent, sparse);
  const alternatives = matches.slice(1, 3).map(m => toMeal(m, session, urgent, intent, sparse));

  return {
    best,
    alternatives,
    needsAdjust: sparse,
    missingEssential: sparse ? missingEssentials(matches[0], urgent) : [],
  };
}
