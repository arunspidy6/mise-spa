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
  history: HistoryEntry[];
  saved: SavedRecipe[];
  setInventory: (i: Partial<Inventory>) => void;
  toggleItem: (cat: keyof Omit<Inventory, "lastUpdated" | "customItems" | "customTokenMap">, item: string) => void;
  finalizeInventory: () => void;
  setSession: (s: Partial<Session>) => void;
  setRecipe: (r: Recipe | null) => void;
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
      session: { timeMinutes: 30, servings: 2, cuisine: null, vibes: [] },
      recipe: null,
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
      setRecipe: (r) => set({ recipe: r }),
      addHistory: (e) =>
        set((s) => {
          // Finishing a cook logs a provisional "good" entry, then the feedback
          // screen logs the real rating. Collapse those into one: if the most
          // recent entry is the same dish within the last 15 min, update it in
          // place instead of adding a duplicate.
          const recent = s.history[0];
          if (recent && recent.name === e.name && e.ts - recent.ts < 15 * 60 * 1000) {
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
