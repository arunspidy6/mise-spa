import { create } from "zustand";
import { persist } from "zustand/middleware";

export type RecipeIngredient = {
  name: string;
  quantity: string;
  inInventory: boolean;
  substituteNote?: string | null;
  criticality?: "essential" | "important" | "optional";
};

export type RecipeStep = {
  number: number;
  instruction: string;
  techniques?: string[];
  ingredientsUsed?: string[];
  timerMinutes?: number | null;
  notes?: string | null;
};

export type Recipe = {
  name: string;
  cuisine: string;
  description: string;
  time_minutes: number;
  difficulty: 1 | 2 | 3;
  servings: number;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  techniqueDefinitions?: Record<string, string>;
  matchLabel?: string;
  matchPercent?: number;
  missingIngredients?: string[];
  requiredSwaps?: { ingredient: string; swap: string }[];
  optionalMissing?: string[];
  sparseFallback?: boolean;
  image?: string;
};

// ── Decision-first model ─────────────────────────────────────────────────────
// We capture the handful of things the user wants to use up — never their whole
// kitchen. Everything else (staples) is assumed by the pantry model.
export type IngredientRole = "protein" | "starch" | "vegetable" | "dairy" | "other";
export type UrgentIngredient = { name: string; role: IngredientRole };

export type IntentPriority = "use-up" | "quick" | "comfort" | "healthy" | "different";
export type CookSize = "1" | "2" | "family" | "meal-prep";
export type Intent = { priority: IntentPriority; size: CookSize };

// ── Internal engine contract ─────────────────────────────────────────────────
// NOT a product concept. The user is never asked to fill this in — the pantry
// model (buildEngineInventory) assembles it from urgent ingredients + assumed
// staples so the recommendation engine has something to score against.
export type Inventory = {
  staples: string[];
  proteins: string[];
  carbs: string[];
  vegetables: string[];
  fridge: string[];
  appliances: string[];
  customItems: string[];
  customTokenMap: Record<string, string>;
  lastUpdated: number | null;
};

type HistoryEntry = {
  name: string;
  cuisine: string;
  rating: "loved" | "good" | "skip";
  ts: number;
};

// A recipe the user saved to cook later. Holds the full recipe so it can be
// re-opened straight from the cookbook, plus the meal-time reminder slot.
export type SavedRecipe = {
  recipe: Recipe;
  savedAt: number;
  cookAt: number;            // when the lunch/dinner reminder fires
  meal: "lunch" | "dinner";
};

type Store = {
  urgent: UrgentIngredient[];
  intent: Intent;
  recipe: Recipe | null;
  history: HistoryEntry[];
  saved: SavedRecipe[];
  setUrgent: (list: UrgentIngredient[]) => void;
  addUrgent: (item: UrgentIngredient) => void;
  removeUrgent: (name: string) => void;
  clearUrgent: () => void;
  setIntent: (i: Partial<Intent>) => void;
  setRecipe: (r: Recipe | null) => void;
  addHistory: (e: HistoryEntry) => void;
  saveRecipe: (entry: SavedRecipe) => void;
  unsaveRecipe: (name: string) => void;
};

export const useMise = create<Store>()(
  persist(
    (set) => ({
      urgent: [],
      intent: { priority: "use-up", size: "2" },
      recipe: null,
      history: [],
      saved: [],
      setUrgent: (list) => set({ urgent: list }),
      addUrgent: (item) =>
        set((s) => {
          const key = item.name.toLowerCase().trim();
          if (!key || s.urgent.some((u) => u.name.toLowerCase().trim() === key)) return s;
          return { urgent: [...s.urgent, item] };
        }),
      removeUrgent: (name) =>
        set((s) => ({ urgent: s.urgent.filter((u) => u.name.toLowerCase().trim() !== name.toLowerCase().trim()) })),
      clearUrgent: () => set({ urgent: [] }),
      setIntent: (i) => set((s) => ({ intent: { ...s.intent, ...i } })),
      setRecipe: (r) => set({ recipe: r }),
      addHistory: (e) =>
        set((s) => {
          // Finishing a cook logs a provisional "good" entry, then the feedback
          // screen logs the real rating. Collapse those into one: if the most
          // recent entry is the same dish within the last 15 min, update it in
          // place instead of adding a duplicate.
          const recent = s.history[0];
          if (recent && recent.name === e.name && Math.abs(e.ts - recent.ts) < 15 * 60 * 1000) {
            const next = [...s.history];
            next[0] = { ...recent, rating: e.rating, ts: e.ts };
            return { history: next };
          }
          return { history: [e, ...s.history].slice(0, 50) };
        }),
      saveRecipe: (entry) =>
        set((s) => ({
          saved: [entry, ...s.saved.filter((x) => x.recipe.name !== entry.recipe.name)],
        })),
      unsaveRecipe: (name) =>
        set((s) => ({ saved: s.saved.filter((x) => x.recipe.name !== name) })),
    }),
    {
      name: "mise-v4",
      onRehydrateStorage: () => (state) => {
        // Clear all older store versions — the decision-first model replaces the
        // pantry-inventory model entirely.
        ["mise-store-v1", "mise-store-v2", "mise-v1", "mise-v2", "mise-v3"].forEach((k) => {
          try { localStorage.removeItem(k); } catch {}
        });
        if (state?.history?.length) {
          const deduped: HistoryEntry[] = [];
          for (const h of state.history) {
            const prev = deduped[deduped.length - 1];
            if (prev && prev.name === h.name && Math.abs(prev.ts - h.ts) < 15 * 60 * 1000) continue;
            deduped.push(h);
          }
          state.history = deduped;
        }
      },
    }
  )
);
