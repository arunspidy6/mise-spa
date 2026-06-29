// The culinary engine orchestrator. Pure + deterministic: ingredients + options
// in, 1–2 recipe blueprints out. No LLM, no I/O.

import type { Classified, EngineInput, EngineResult } from "./types";
import { classifyList } from "./classify";
import { rankDirections } from "./score";
import { buildBlueprint } from "./blueprint";

const SEAFOOD = new Set(["salmon", "white fish", "oily fish", "smoked salmon", "prawns", "tuna"]);
const MEAT = new Set(["chicken", "beef", "pork", "lamb", "bacon", "sausages"]);
const DAIRY = new Set(["cream", "milk", "cheddar", "parmesan", "yoghurt", "butter"]);
const ANIMAL = new Set([...MEAT, ...SEAFOOD, "eggs", "honey"]);
const GLUTEN = new Set(["pasta", "bread", "couscous", "noodles", "tortillas"]);

function applyDiet(items: Classified[], prefs: string[]): Classified[] {
  const p = prefs.map(s => s.toLowerCase());
  return items.filter(i => {
    if (p.includes("vegan") && (ANIMAL.has(i.key) || DAIRY.has(i.key))) return false;
    if (p.includes("vegetarian") && (MEAT.has(i.key) || SEAFOOD.has(i.key))) return false;
    if (p.includes("pescatarian") && MEAT.has(i.key)) return false;
    if ((p.includes("dairy-free") || p.includes("dairy free")) && DAIRY.has(i.key)) return false;
    if ((p.includes("gluten-free") || p.includes("gluten free")) && GLUTEN.has(i.key)) return false;
    return true;
  });
}

export function runEngine(input: EngineInput): EngineResult {
  const dietary = input.dietary_preferences ?? [];
  const avoid = new Set((input.avoid_ingredients ?? []).map(s => s.toLowerCase().trim()));

  let classified = classifyList(input.ingredients ?? []);
  // Remove explicitly avoided ingredients (match by key or display).
  classified = classified.filter(i => !avoid.has(i.key) && !avoid.has(i.display.toLowerCase()));
  // Apply dietary constraints.
  if (dietary.length) classified = applyDiet(classified, dietary);

  if (classified.length === 0) {
    return { classified, blueprints: [], note: "No usable ingredients were provided after applying your filters." };
  }

  const ranked = rankDirections(classified, input.cuisine);
  const servings = input.servings && input.servings > 0 ? input.servings : 2;
  const common = {
    servings, maxPrepTime: input.max_prep_time, equipment: input.equipment,
    dietary, skillLevel: input.skill_level,
  };

  // Safe/traditional recipe from the strongest direction.
  const safe = buildBlueprint(ranked[0], classified, { ...common, creativity: "safe" });

  // A meaningfully different second direction (different cuisine, still credible).
  const creativeDir = ranked.slice(1).find(r =>
    r.template.id !== ranked[0].template.id && r.score >= Math.max(0.18, ranked[0].score - 0.28),
  );

  const blueprints = [safe];
  let note: string | undefined;
  if (creativeDir) {
    blueprints.push(buildBlueprint(creativeDir, classified, { ...common, creativity: "creative" }));
  } else {
    note = `Your ingredients point strongly toward one ${ranked[0].template.name} direction; a credibly different second recipe wasn't available without inventing ingredients, so we returned the best single option.`;
  }

  if (ranked[0].score < 0.2) {
    note = (note ? note + " " : "") +
      "This is a best-effort match — the ingredient set is sparse, so consider the optional items to round it out.";
  }

  return { classified, blueprints, note };
}
