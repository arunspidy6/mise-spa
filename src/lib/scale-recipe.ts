// Serving scaling for the "dump" variant. Its flow generates a recipe straight
// away (default servings), then asks "how many people?" afterwards — so we scale
// the model's ingredient quantities client-side rather than regenerating (which
// would change the dish). Purely a display transform; the stored recipe and the
// recipe batch are never mutated, so scaling can't compound.

import type { Recipe } from "@/store/mise";

const UNICODE_FRAC: Record<string, number> = {
  "½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3,
  "⅛": 0.125, "⅜": 0.375, "⅝": 0.625, "⅞": 0.875,
};

// Render a scaled number back as a cook-friendly string — whole numbers stay
// whole, common fractions become their glyphs, everything else is a short
// decimal. Avoids "0.6666666 onion".
function fmtNum(n: number): string {
  if (!isFinite(n) || n <= 0) return "0";
  const rounded = Math.round(n * 100) / 100;
  const whole = Math.floor(rounded + 1e-9);
  const rem = rounded - whole;

  const fracs: [number, string][] = [
    [0.25, "¼"], [1 / 3, "⅓"], [0.5, "½"], [2 / 3, "⅔"], [0.75, "¾"],
  ];
  for (const [val, sym] of fracs) {
    if (Math.abs(rem - val) < 0.06) return (whole > 0 ? whole : "") + sym;
  }
  if (rem < 0.06) return String(whole);
  // Fall back to a tidy decimal (one place is plenty for cooking).
  return String(Math.round(rounded * 10) / 10);
}

// Scale every numeric token in a quantity string: "400g" → "800g",
// "1/2 tsp" → "1 tsp", "2 cloves" → "4 cloves". Non-numeric amounts
// ("a pinch", "to taste", "handful") pass through untouched.
export function scaleQuantity(q: string, factor: number): string {
  if (!q || factor === 1) return q;
  return q.replace(/(\d+\s*\/\s*\d+|\d+(?:\.\d+)?|[½¼¾⅓⅔⅛⅜⅝⅞])/g, (m) => {
    let val: number;
    const frac = UNICODE_FRAC[m];
    if (frac != null) {
      val = frac;
    } else if (m.includes("/")) {
      const [a, b] = m.split("/").map((x) => parseFloat(x));
      val = b ? a / b : NaN;
    } else {
      val = parseFloat(m);
    }
    if (!isFinite(val)) return m;
    return fmtNum(val * factor);
  });
}

// A copy of the recipe with ingredient quantities scaled from the model's
// serving count to the requested one. Steps are left as-is (they reference
// techniques, not just amounts) — the ingredient list is the source of truth
// the cook measures from.
export function scaleRecipe(recipe: Recipe, targetServings: number): Recipe {
  const base = recipe.servings || targetServings || 1;
  const factor = targetServings / base;
  if (!isFinite(factor) || factor === 1) {
    return recipe.servings === targetServings ? recipe : { ...recipe, servings: targetServings };
  }
  return {
    ...recipe,
    servings: targetServings,
    ingredients: (recipe.ingredients ?? []).map((i) => ({
      ...i,
      quantity: scaleQuantity(i.quantity, factor),
    })),
  };
}
