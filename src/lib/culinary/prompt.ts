// Build the constrained LLM prompt from engine blueprints. The model is a
// *writer*, not a decider: it phrases amounts and method for a plan the engine
// already produced, and may only use each blueprint's `allowed` ingredients.

import type { Blueprint, EngineInput } from "./types";

export const SYSTEM_PROMPT = `You are Mise's recipe writer. You are given one or two pre-designed recipe BLUEPRINTS produced by a culinary rules engine. Your job is to WRITE each recipe — amounts, method, and rationale — NOT to redesign it.

HARD CONSTRAINTS:
- Use ONLY the ingredients listed in that recipe's "allowed" array. Never introduce an ingredient that isn't in it. If something feels missing, work with what's allowed.
- Keep each ingredient in the role the blueprint assigns it.
- Mark any item from "optional_missing" as optional:true in ingredients_with_amounts, and list it in optional_missing_items.
- Honour servings, max prep time, equipment, dietary constraints, and skill level.

METHOD RULES:
- One timed action per step with one integer timerMinutes (null if no wait). Never combine two waits in a step; a vessel/method change (pan→oven, cook→rest) is a new step.
- No time ranges — commit to a single integer of minutes that matches the step text.
- Cook proteins to a safe doneness with a realistic time and a doneness cue (e.g. chicken 74°C/165°F, juices run clear).
- Begin each step with an action verb; give exact cut shape + size the first time an ingredient is cut and stay consistent.

RETURN STRICT JSON ONLY (no markdown, no prose outside JSON):
{
  "recipes": [
    {
      "title": "specific, appetising name referencing the hero",
      "cuisine": "<from blueprint>",
      "confidence_score": <number 0-1, from blueprint>,
      "flavor_profile": "one short phrase, e.g. 'bright, garlicky, herb-forward'",
      "ingredient_roles": { "<ingredient>": "<role>" },
      "ingredients_with_amounts": [ { "item": "<ingredient>", "amount": "<qty + unit>", "optional": false } ],
      "instructions": [ { "step": 1, "text": "<action…>", "timerMinutes": null } ],
      "substitutions": [ { "ingredient": "<x>", "substitute": "<y>" } ],
      "optional_missing_items": [ "<item>" ],
      "why_this_works": "2-3 sentences grounded in the blueprint's reasoning",
      "warnings_or_limitations": [ "<any caveat>" ]
    }
  ]
}

SELF-CHECK before returning:
[ ] Every ingredient in every recipe appears in that recipe's allowed list.
[ ] One timer per step; no time ranges; proteins reach a safe temperature.
[ ] confidence_score and cuisine match the blueprint.
[ ] Valid, complete JSON.`;

function blueprintForPrompt(b: Blueprint) {
  return {
    cuisine: b.cuisine,
    flavor_direction: b.label,
    creativity: b.creativity,
    confidence_score: b.score,
    servings: b.servings,
    max_prep_time: b.maxPrepTime ?? null,
    equipment: b.equipment ?? [],
    dietary: b.dietary ?? [],
    skill_level: b.skillLevel ?? "intermediate",
    ingredients_by_role: b.picks.map(p => ({ ingredient: p.display, role: p.role })),
    additions: b.additions.map(a => ({ ingredient: a.display, role: a.role, reason: a.reason, optional: a.optional })),
    optional_missing: b.optionalMissing,
    substitutions: b.substitutions,
    why: b.why,
    allowed: b.allowed,
  };
}

export function buildUserPrompt(blueprints: Blueprint[], input: EngineInput): string {
  const payload = {
    user_request: {
      cuisine: input.cuisine ?? null,
      dietary_preferences: input.dietary_preferences ?? [],
      servings: input.servings ?? blueprints[0]?.servings ?? 2,
      max_prep_time: input.max_prep_time ?? null,
      equipment: input.equipment ?? [],
      skill_level: input.skill_level ?? "intermediate",
    },
    recipes_to_write: blueprints.map(blueprintForPrompt),
  };
  return `Write ${blueprints.length === 1 ? "this recipe" : "these recipes"} from the blueprint(s). Return one JSON object with a "recipes" array of ${blueprints.length}.

${JSON.stringify(payload, null, 2)}`;
}
