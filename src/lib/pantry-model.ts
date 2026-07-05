// ── Layer 1: Ingredient understanding + pantry assumption model ──────────────
// The user never documents their kitchen. They name a few things they want to
// use up. This layer turns that short list into something the recommendation
// engine can reason over:
//   1. classifyRole  — is this a protein / starch / vegetable / dairy / other?
//   2. an assumption model — what can we safely assume is in every kitchen, and
//      at what confidence, so we never block a recommendation on a staple.
//   3. buildEngineInventory — assemble the engine's internal Inventory contract
//      from (urgent ingredients ∪ assumed pantry) so findRecipes() can score.
//
// The internal `Inventory` type is an engine implementation detail, NOT a
// product concept — the user is never asked to fill it in.
import type { Inventory, Recipe, UrgentIngredient, IngredientRole } from "@/store/mise";
import { STAPLES_DEFAULTS } from "./mise-data";

// ── Pantry assumption model ──────────────────────────────────────────────────
// HIGH   — assume silently, always. Never surface, never block. (salt, oil…)
// MEDIUM — assume, but show as "assumed pantry" so the user can mentally check.
// LOW    — treat as optional flavour. Never assumed present, never a warning.
export const PANTRY_HIGH = ["salt", "cooking oil", "olive oil", "oil", "water"];
export const PANTRY_MEDIUM = ["black pepper", "pepper", "garlic", "onion", "butter", "stock", "stock cubes", "flour", "sugar", "vinegar", "tomato paste"];
export const PANTRY_LOW = ["herbs", "rosemary", "thyme", "parsley", "oregano", "basil", "coriander", "paprika", "cumin", "turmeric", "chilli flakes", "chilli", "chilli powder", "cayenne", "curry powder", "garam masala", "lemon", "lemons", "honey", "soy sauce"];

const norm = (s: string) => s.toLowerCase().trim().replace(/\s+/g, " ");

// True for staples we quietly assume every kitchen has (HIGH or MEDIUM). These
// appear in the "Assumed pantry" group on the decision screen — never as a
// missing-ingredient problem.
export function isAssumedPantry(name: string): boolean {
  const n = norm(name);
  return [...PANTRY_HIGH, ...PANTRY_MEDIUM].some(p => n === p || n.includes(p) || p.includes(n));
}

// True for low-impact flavour enhancers we never block on.
export function isOptionalFlavour(name: string): boolean {
  const n = norm(name);
  return PANTRY_LOW.some(p => n === p || n.includes(p) || p.includes(n));
}

// ── Role classification ──────────────────────────────────────────────────────
const ROLE_KEYWORDS: Record<Exclude<IngredientRole, "other">, string[]> = {
  protein: [
    "chicken", "beef", "steak", "mince", "pork", "sausage", "bacon", "lamb",
    "salmon", "fish", "cod", "haddock", "tuna", "prawn", "shrimp", "egg",
    "tofu", "chickpea", "chick pea", "lentil", "bean", "turkey", "duck", "ham",
  ],
  starch: [
    "pasta", "spaghetti", "penne", "fusilli", "noodle", "rice", "potato",
    "bread", "tortilla", "wrap", "couscous", "quinoa", "gnocchi", "oats", "flour",
  ],
  vegetable: [
    "tomato", "onion", "carrot", "pepper", "capsicum", "mushroom", "spinach",
    "broccoli", "courgette", "zucchini", "cauliflower", "pea", "corn", "leek",
    "cabbage", "kale", "aubergine", "eggplant", "bean sprout", "celery",
    "lettuce", "cucumber", "squash", "pumpkin", "beet", "greens", "veg",
  ],
  dairy: [
    "milk", "cream", "cheese", "cheddar", "parmesan", "mozzarella", "yoghurt",
    "yogurt", "butter", "feta", "halloumi",
  ],
};

export function classifyRole(name: string): IngredientRole {
  const n = norm(name);
  for (const role of ["protein", "starch", "dairy", "vegetable"] as const) {
    if (ROLE_KEYWORDS[role].some(k => n.includes(k))) return role;
  }
  return "other";
}

export function toUrgent(name: string): UrgentIngredient {
  return { name: name.trim(), role: classifyRole(name) };
}

// ── Engine adapter ───────────────────────────────────────────────────────────
// Map the urgent list into the engine's Inventory shape. Urgent items land in
// their role bucket; the assumed pantry (STAPLES_DEFAULTS) is injected as
// `staples` so the engine can satisfy essentials like salt/oil without the user
// ever listing them. Raw typed names go into `customItems` too, so the engine's
// "user explicitly asked for this" 1.5× boost fires on exactly what they typed.
export function buildEngineInventory(urgent: UrgentIngredient[]): Inventory {
  const proteins: string[] = [];
  const carbs: string[] = [];
  const vegetables: string[] = [];
  const fridge: string[] = [];
  const customItems: string[] = [];

  for (const u of urgent) {
    const name = u.name.trim();
    if (!name) continue;
    customItems.push(name.toLowerCase());
    switch (u.role) {
      case "protein": proteins.push(name); break;
      case "starch": carbs.push(name); break;
      case "vegetable": vegetables.push(name); break;
      case "dairy": fridge.push(name); break;
      default: fridge.push(name); break; // "other" still counts as something to use
    }
  }

  return {
    staples: [...STAPLES_DEFAULTS],
    proteins,
    carbs,
    vegetables,
    fridge,
    appliances: ["Hob / Stove", "Oven"],
    customItems,
    customTokenMap: {},
    lastUpdated: Date.now(),
  };
}

// ── Confidence grouping for the decision screen ──────────────────────────────
// Split a generated recipe's ingredients into the three trust groups the UI
// shows. Optional items are NEVER framed as missing — they're a nice-to-have.
export type IngredientGroups = {
  available: string[];     // ✔ things the user actually told us about
  assumedPantry: string[]; // ✓ staples we quietly assume
  optional: string[];      // ○ flavour enhancers — fine to skip
};

function matchesUrgent(ingredientName: string, urgent: UrgentIngredient[]): boolean {
  const n = norm(ingredientName);
  return urgent.some(u => {
    const un = norm(u.name);
    return n === un || n.includes(un) || un.includes(n);
  });
}

export function groupIngredients(recipe: Recipe, urgent: UrgentIngredient[]): IngredientGroups {
  const available: string[] = [];
  const assumedPantry: string[] = [];
  const optional: string[] = [];
  const seen = new Set<string>();

  for (const ing of recipe.ingredients ?? []) {
    const key = norm(ing.name);
    if (seen.has(key)) continue;
    seen.add(key);

    if (matchesUrgent(ing.name, urgent)) {
      available.push(ing.name);
    } else if (ing.criticality === "optional" || isOptionalFlavour(ing.name)) {
      optional.push(ing.name);
    } else if (isAssumedPantry(ing.name)) {
      assumedPantry.push(ing.name);
    } else {
      // Needed but not typed and not a staple — safest to present as assumed
      // rather than alarm the user (viable recipes never miss an essential).
      assumedPantry.push(ing.name);
    }
  }

  // Fold in optional items the engine flagged as "not needed" (optionalMissing).
  for (const o of recipe.optionalMissing ?? []) {
    if (!optional.some(x => norm(x) === norm(o))) optional.push(o);
  }

  return { available, assumedPantry, optional };
}
