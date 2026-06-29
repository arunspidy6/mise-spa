// Guardrails: validate and repair an LLM-written recipe against its blueprint so
// the model cannot smuggle in unsupported ingredients, and the output always
// conforms to the schema. This is the deterministic gate after generation.

import type { Blueprint, RecipeOption } from "./types";
import { normalizeOne } from "./normalize";

// Collapse a range like "5-6 minutes" to its upper bound; leave temperatures.
function deRange(text: string): string {
  return typeof text === "string"
    ? text.replace(
        /(\d+)\s*(?:[–—-]|to|or)\s*(\d+)(\s*(?:minutes?|mins?|seconds?|secs?|hours?|hrs?))/gi,
        (_m, _lo, hi, unit) => `${hi}${unit}`,
      )
    : text;
}

const keyOf = (s: string) => normalizeOne(s).key;

export function validateRecipe(raw: any, bp: Blueprint): RecipeOption | null {
  if (!raw || typeof raw !== "object" || !raw.title) return null;

  // Allowed ingredient keys for this blueprint.
  const allowedKeys = new Set(bp.allowed.map(keyOf));
  const optionalKeys = new Set(bp.optionalMissing.map(keyOf));

  // 1) Filter ingredients to the allowed set (drop anything invented).
  const stripped: string[] = [];
  const ingredients = (Array.isArray(raw.ingredients_with_amounts) ? raw.ingredients_with_amounts : [])
    .filter((x: any) => x && typeof x.item === "string")
    .filter((x: any) => {
      const ok = allowedKeys.has(keyOf(x.item));
      if (!ok) stripped.push(x.item);
      return ok;
    })
    .map((x: any) => ({
      item: String(x.item),
      amount: String(x.amount ?? "to taste"),
      optional: optionalKeys.has(keyOf(x.item)) || Boolean(x.optional),
    }));

  if (ingredients.length === 0) return null; // nothing usable survived

  // 2) Normalise instructions: ordered steps, single-range timers.
  const instructions = (Array.isArray(raw.instructions) ? raw.instructions : [])
    .filter((s: any) => s && typeof s.text === "string")
    .map((s: any, i: number) => ({
      step: Number.isInteger(s.step) ? s.step : i + 1,
      text: deRange(String(s.text)),
      timerMinutes: Number.isInteger(s.timerMinutes) ? s.timerMinutes : null,
    }));
  if (instructions.length === 0) return null;

  // 3) ingredient_roles, restricted to allowed items.
  const roles: Record<string, string> = {};
  if (raw.ingredient_roles && typeof raw.ingredient_roles === "object") {
    for (const [k, v] of Object.entries(raw.ingredient_roles)) {
      if (allowedKeys.has(keyOf(k))) roles[k] = String(v);
    }
  }

  const warnings: string[] = Array.isArray(raw.warnings_or_limitations)
    ? raw.warnings_or_limitations.map(String) : [];
  if (stripped.length) warnings.push(`Removed unsupported item(s): ${[...new Set(stripped)].join(", ")}.`);

  // 4) Re-anchor confidence + cuisine to the blueprint (not the model's whim).
  return {
    title: String(raw.title),
    cuisine: bp.cuisine,
    confidence_score: bp.score,
    flavor_profile: String(raw.flavor_profile ?? bp.label),
    ingredient_roles: roles,
    ingredients_with_amounts: ingredients,
    instructions,
    substitutions: Array.isArray(raw.substitutions)
      ? raw.substitutions.filter((s: any) => s?.ingredient && s?.substitute)
          .map((s: any) => ({ ingredient: String(s.ingredient), substitute: String(s.substitute) }))
      : bp.substitutions,
    optional_missing_items: Array.isArray(raw.optional_missing_items) && raw.optional_missing_items.length
      ? raw.optional_missing_items.map(String)
      : bp.optionalMissing,
    why_this_works: String(raw.why_this_works ?? bp.why.join(" ")),
    warnings_or_limitations: warnings,
  };
}

// Validate the whole batch; pair each returned recipe with its blueprint by
// order (the prompt asks for them in blueprint order).
export function validateBatch(rawRecipes: any[], blueprints: Blueprint[]): RecipeOption[] {
  const out: RecipeOption[] = [];
  for (let i = 0; i < blueprints.length; i++) {
    const v = validateRecipe(rawRecipes?.[i], blueprints[i]);
    if (v) out.push(v);
  }
  return out;
}
