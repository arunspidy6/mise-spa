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

type Store = {
  inventory: Inventory;
  session: Session;
  recipe: Recipe | null;
  history: HistoryEntry[];
  setInventory: (i: Partial<Inventory>) => void;
  toggleItem: (cat: keyof Omit<Inventory, "lastUpdated">, item: string) => void;
  finalizeInventory: () => void;
  setSession: (s: Partial<Session>) => void;
  setRecipe: (r: Recipe | null) => void;
  addHistory: (e: HistoryEntry) => void;
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
        lastUpdated: null,
      },
      session: { timeMinutes: 30, servings: 2, cuisine: null, vibes: [] },
      recipe: null,
      history: [],
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
        set((s) => ({ history: [e, ...s.history].slice(0, 50) })),
    }),
    {
      name: "mise-v3",
      onRehydrateStorage: () => () => {
        // Clear all old store versions on first load
        ["mise-store-v1", "mise-store-v2", "mise-v1", "mise-v2"].forEach(k => {
          try { localStorage.removeItem(k); } catch {}
        });
      },
    }
  )
);
