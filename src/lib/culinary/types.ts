// Shared types for the deterministic culinary engine.
//
// The engine turns a user's ingredients (plus options) into 1–2 recipe
// "blueprints" using curated culinary knowledge — no LLM. The LLM later only
// writes prose for a blueprint, and guardrails ensure it can't add ingredients
// the blueprint didn't allow.

export type Role =
  | "base"      // the carbohydrate / structural foundation (rice, pasta, potato…)
  | "protein"
  | "veg"
  | "aromatic"  // onion, garlic, ginger — flavour foundation
  | "acid"      // lemon, vinegar — brightness
  | "fat"       // oil, butter, cream — body / carries flavour
  | "heat"      // chilli, cayenne
  | "herb"
  | "spice"
  | "sweet"
  | "crunch"
  | "garnish";

export type Classified = {
  input: string;       // original user string
  key: string;         // canonical key
  display: string;     // nicely cased display name
  roles: Role[];       // primary role first
  notes: string[];     // flavour tags: umami, dairy, starchy, fresh, smoky, nutty…
  cuisines: string[];  // cuisines this ingredient is at home in
  staple: boolean;     // pantry staple (assumed available)
  known: boolean;      // found in the knowledge base
};

export type EngineInput = {
  ingredients: string[];
  cuisine?: string;
  dietary_preferences?: string[];   // vegetarian | vegan | pescatarian | gluten-free | dairy-free
  servings?: number;
  max_prep_time?: number;           // minutes
  equipment?: string[];
  avoid_ingredients?: string[];
  skill_level?: "beginner" | "intermediate" | "advanced";
};

export type Addition = {
  display: string;
  role: Role;
  reason: string;       // why it's added — balance / acidity / fat / aroma…
  optional: boolean;    // true = user may not own it (a small missing item)
};

export type Blueprint = {
  id: string;
  cuisine: string;
  label: string;        // the flavour direction, e.g. "garlic-lemon butter"
  creativity: "safe" | "creative";
  score: number;        // 0..1 confidence the engine has in this direction
  baseKey?: string;
  proteinKey?: string;
  picks: { role: Role; key: string; display: string }[];  // chosen owned ingredients
  additions: Addition[];                                   // justified extra items
  optionalMissing: string[];                              // small items to complete the dish
  substitutions: { ingredient: string; substitute: string }[];
  why: string[];        // bullet reasons this works
  allowed: string[];    // display names the LLM may use (owned picks + additions + staples)
  // passthrough constraints
  servings: number;
  maxPrepTime?: number;
  equipment?: string[];
  dietary?: string[];
  skillLevel?: string;
};

export type EngineResult = {
  classified: Classified[];
  blueprints: Blueprint[];   // 1–2
  note?: string;             // explanation when only 1 was credible
};

// ── Final LLM-written, guardrail-validated output (the API response shape) ──
export type RecipeOption = {
  title: string;
  cuisine: string;
  confidence_score: number;                 // mirrors blueprint.score
  flavor_profile: string;
  ingredient_roles: Record<string, string>; // ingredient -> role
  ingredients_with_amounts: { item: string; amount: string; optional?: boolean }[];
  instructions: { step: number; text: string; timerMinutes: number | null }[];
  substitutions: { ingredient: string; substitute: string }[];
  optional_missing_items: string[];
  why_this_works: string;
  warnings_or_limitations: string[];
};

export type EngineOutput = {
  recipes: RecipeOption[];
  note?: string;
};
