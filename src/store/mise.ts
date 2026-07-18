import { create } from "zustand";
import { persist } from "zustand/middleware";
import { STAPLES_DEFAULTS } from "@/lib/mise-data";

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
  // A short plain-language gist of what this step accomplishes (≤ 8 words, no
  // quantities) — shown in the read-ahead preview. Optional: older/cached
  // recipes fall back to a shortened instruction.
  summary?: string;
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
  // Model-authored "why this dish" confidence panel. Optional — older/cached
  // recipes won't have it, so the recipe screen derives a fallback when absent.
  why?: {
    reasons: string[];
    completion: "Low" | "Medium" | "High";
    effort: "Low" | "Medium" | "High";
    tasteNote: string;
    flavourRationale?: string;
    provenance?: "classic" | "adapted" | "original";
  };
};

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

type Session = {
  timeMinutes: number;
  servings: number;
  cuisine: string | null;
  vibes: string[];
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
  inventory: Inventory;
  session: Session;
  recipe: Recipe | null;
  // "Not this" cycles through a small batch of generated recipes. New recipes
  // are appended (up to 3) via one API call each; once the batch is full,
  // "Not this" just loops through them locally — no more API calls.
  recipeBatch: Recipe[];
  batchIndex: number;
  history: HistoryEntry[];
  saved: SavedRecipe[];
  setInventory: (i: Partial<Inventory>) => void;
  toggleItem: (cat: keyof Omit<Inventory, "lastUpdated" | "customItems" | "customTokenMap">, item: string) => void;
  finalizeInventory: () => void;
  setSession: (s: Partial<Session>) => void;
  // setRecipe starts a fresh batch (a new generation or opening a saved recipe).
  setRecipe: (r: Recipe | null) => void;
  // Set a whole pre-generated slate (up to 3) as the batch; shows the first.
  setBatch: (rs: Recipe[]) => void;
  // Append a freshly generated alternative to the batch and show it (caps at 3).
  pushRecipe: (r: Recipe) => void;
  // Append to the batch WITHOUT changing the shown recipe (background prefetch).
  appendToBatch: (r: Recipe) => void;
  // Advance to the next recipe in the full batch, wrapping around. No API call.
  cycleRecipe: () => void;
  addHistory: (e: HistoryEntry) => void;
  // Save a recipe to cook later (dedupes by name).
  saveRecipe: (entry: SavedRecipe) => void;
  // Remove a saved recipe — on manual un-save, or once it's been cooked.
  unsaveRecipe: (name: string) => void;
  addCustomItem: (item: string) => void;
  clearCustomItems: () => void;
  addCustomTokenMapping: (displayLabel: string, satToken: string) => void;
  // After cooking, proteins & veg are "used up". Staples/spices persist.
  clearProteinsAndVeggies: () => void;
};

export const useMise = create<Store>()(
  persist(
    (set) => ({
      inventory: {
        staples: [...STAPLES_DEFAULTS],
        proteins: [],
        carbs: [],
        vegetables: [],
        fridge: [],
        appliances: ["Hob / Stove", "Oven"],
        customItems: [],
        customTokenMap: {},
        lastUpdated: null,
      },
      session: { timeMinutes: 45, servings: 2, cuisine: null, vibes: [] },
      recipe: null,
      recipeBatch: [],
      batchIndex: 0,
      history: [],
      saved: [],
      setInventory: (i) => set((s) => ({ inventory: { ...s.inventory, ...i } })),
      toggleItem: (cat, item) =>
        set((s) => {
          const list = (s.inventory[cat] as string[] | undefined) ?? [];
          const next = list.includes(item)
            ? list.filter((x) => x !== item)
            : [...list, item];
          return { inventory: { ...s.inventory, [cat]: next } };
        }),
      finalizeInventory: () =>
        set((s) => ({ inventory: { ...s.inventory, lastUpdated: Date.now() } })),
      setSession: (s2) => set((s) => ({ session: { ...s.session, ...s2 } })),
      // A fresh recipe (new generation / opened from cookbook) starts a new
      // batch containing just that recipe.
      setRecipe: (r) => set({ recipe: r, recipeBatch: r ? [r] : [], batchIndex: 0 }),
      // A whole pre-generated slate (up to 3) becomes the batch in one go — the
      // first recipe is shown, "Not this" advances through the rest. No further
      // generation happens per rejection.
      setBatch: (rs) =>
        set(() => {
          const batch = (rs ?? []).slice(0, 3);
          return { recipe: batch[0] ?? null, recipeBatch: batch, batchIndex: 0 };
        }),
      pushRecipe: (r) =>
        set((s) => {
          const batch = [...s.recipeBatch, r].slice(0, 3);
          return { recipe: r, recipeBatch: batch, batchIndex: batch.length - 1 };
        }),
      appendToBatch: (r) =>
        set((s) => {
          if (s.recipeBatch.length >= 3) return {};
          // De-dupe by name; don't touch `recipe`/`batchIndex` (prefetch is silent).
          if (s.recipeBatch.some((x) => x.name === r.name)) return {};
          return { recipeBatch: [...s.recipeBatch, r] };
        }),
      cycleRecipe: () =>
        set((s) => {
          if (s.recipeBatch.length === 0) return {};
          const batchIndex = (s.batchIndex + 1) % s.recipeBatch.length;
          return { batchIndex, recipe: s.recipeBatch[batchIndex] };
        }),
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
      addCustomItem: (item) =>
        set((s) => ({
          inventory: {
            ...s.inventory,
            customItems: [...(s.inventory.customItems ?? []), item.toLowerCase().trim()],
          },
        })),
      clearCustomItems: () =>
        set((s) => ({ inventory: { ...s.inventory, customItems: [] } })),
      addCustomTokenMapping: (displayLabel, satToken) =>
        set((s) => ({
          inventory: {
            ...s.inventory,
            customTokenMap: {
              ...(s.inventory.customTokenMap ?? {}),
              [displayLabel.toLowerCase().trim()]: satToken,
            },
          },
        })),
      clearProteinsAndVeggies: () =>
        set((s) => ({
          inventory: { ...s.inventory, proteins: [], vegetables: [] },
        })),
    }),
    {
      name: "mise-v3",
      onRehydrateStorage: () => (state) => {
        // Clear all old store versions on first load
        ["mise-store-v1", "mise-store-v2", "mise-v1", "mise-v2"].forEach(k => {
          try { localStorage.removeItem(k); } catch {}
        });
        // One-time cleanup of the cook→feedback double-log: collapse adjacent
        // same-dish entries (within 15 min) that earlier versions duplicated,
        // keeping the newer one (which carries the user's real rating).
        if (state?.history?.length) {
          const deduped: HistoryEntry[] = [];
          for (const h of state.history) {
            const prev = deduped[deduped.length - 1];
            if (prev && prev.name === h.name && Math.abs(prev.ts - h.ts) < 15 * 60 * 1000) continue;
            deduped.push(h);
          }
          state.history = deduped;
        }
        // Kitchen persists across visits — the full inventory (proteins, carbs,
        // vegetables, fridge, staples, appliances, custom items) is remembered,
        // so a refresh no longer wipes what the user selected.
      },
    }
  )
);
