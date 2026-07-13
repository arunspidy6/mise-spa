import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, X, Plus } from "lucide-react";
import { MobileFrame } from "@/components/mise/MobileFrame";
import { KeyboardAwareFooter } from "@/components/mise/KeyboardAwareFooter";
import { EmberButton } from "@/components/mise/EmberButton";
import { useMise } from "@/store/mise";
import type { Inventory } from "@/store/mise";
import { useSwipeBack } from "@/hooks/use-swipe-back";
import { hapticLight } from "@/lib/haptics";
import { CustomItemInput, MASTER_INGREDIENTS, CATEGORY_LABEL, type AddResult } from "./inventory";

export const Route = createFileRoute("/kitchen")({
  validateSearch: (s: Record<string, unknown>) => ({
    from: typeof s.from === "string" ? s.from : undefined,
  }),
  component: KitchenOverview,
});

// Display order for the overview. `staples` shows as "Pantry".
const SECTIONS: { key: keyof Inventory; label: string }[] = [
  { key: "proteins", label: "Protein" },
  { key: "vegetables", label: "Vegetables" },
  { key: "carbs", label: "Carbs" },
  { key: "fridge", label: "Fridge & extras" },
  { key: "staples", label: "Pantry" },
  { key: "appliances", label: "Appliances" },
];

const VALID_CATS = ["proteins", "carbs", "vegetables", "fridge", "staples"];

// Shown when a section is empty, so a returning user gets a quick nudge instead
// of a blank category. All are known ingredients (correct category + satToken).
const SUGGESTIONS: Record<string, string[]> = {
  proteins: ["Chicken breast", "Eggs", "Beef mince"],
  vegetables: ["Tomatoes", "Carrots", "Potatoes"],
  carbs: ["Rice", "Pasta", "Bread"],
  fridge: ["Cheddar", "Butter", "Milk"],
  staples: ["Olive oil", "Garlic", "Soy sauce"],
  appliances: ["Hob / Stove", "Oven", "Microwave"],
};

// A single-screen overview of what the user actually owns — the returning-user
// alternative to the first-time 6-step setup. Add via the search bar (auto-
// categorised), remove by tapping a chip's ×, then proceed to recipes.
function KitchenOverview() {
  const navigate = useNavigate();
  const { from } = Route.useSearch();
  const inventory = useMise(s => s.inventory);
  const setInventory = useMise(s => s.setInventory);
  const finalize = useMise(s => s.finalizeInventory);
  const addCustomItem = useMise(s => s.addCustomItem);
  const addCustomTokenMapping = useMise(s => s.addCustomTokenMapping);

  const back = () => navigate({ to: from === "session" ? "/session" : "/" });
  useSwipeBack(back);
  const proceed = () => { finalize(); navigate({ to: "/session" }); };

  const removeItem = (cat: keyof Inventory, item: string) => {
    hapticLight();
    const list = (inventory[cat] as string[]) ?? [];
    setInventory({ [cat]: list.filter(x => x !== item) } as never);
  };

  // Add routes to the item's true category (classifier / master), else fridge.
  const onAdd = (item: string, category?: string): AddResult => {
    const lower = item.toLowerCase();
    const cat = ((category && VALID_CATS.includes(category) ? category
      : MASTER_INGREDIENTS[lower]?.category) ?? "fridge") as keyof Inventory;
    const list = (inventory[cat] as string[]) ?? [];
    if (!list.map(x => x.toLowerCase()).includes(lower)) {
      setInventory({ [cat]: [...list, item] } as never);
      addCustomItem(item);
      return { kind: "added", label: CATEGORY_LABEL[cat] };
    }
    return { kind: "duplicate", label: CATEGORY_LABEL[cat] };
  };

  // Tap an empty-section suggestion to add it. Uses its true category + satToken
  // (falling back to the section key for appliances, which aren't ingredients).
  const addSuggestion = (secKey: keyof Inventory, item: string) => {
    const lower = item.toLowerCase();
    const entry = MASTER_INGREDIENTS[lower];
    const cat = (entry?.category ?? secKey) as keyof Inventory;
    const list = (inventory[cat] as string[]) ?? [];
    if (list.map(x => x.toLowerCase()).includes(lower)) return;
    if (entry) addCustomTokenMapping(lower, entry.satToken);
    setInventory({ [cat]: [...list, item] } as never);
    addCustomItem(item);
    hapticLight();
  };

  const itemCount =
    (inventory.proteins?.length ?? 0) + (inventory.carbs?.length ?? 0) +
    (inventory.vegetables?.length ?? 0) + (inventory.fridge?.length ?? 0);

  return (
    <MobileFrame>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 px-6 pt-5">
          <button onClick={back}
            className="w-10 h-10 -ml-2 flex items-center justify-center text-text-secondary active:scale-90">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display text-[34px] font-light text-text-primary leading-none mt-2">Your Kitchen</h1>
          <p className="text-[13px] text-text-secondary mt-2">
            {itemCount} {itemCount === 1 ? "ingredient" : "ingredients"} · tap × to remove
          </p>
        </div>

        {/* Search / custom add — auto-sorts into the right section */}
        <div className="flex-shrink-0 px-6 pt-4">
          <CustomItemInput onAdd={onAdd} addMapping={addCustomTokenMapping} />
        </div>

        {/* Sections — only the user's own items */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 pb-4 space-y-6">
          {SECTIONS.map(sec => {
            const items = (inventory[sec.key] as string[] | undefined) ?? [];
            const ownedLower = items.map(x => x.toLowerCase());
            // Suggestions persist alongside owned items — show any of the 3 the
            // user hasn't added to this category yet.
            const suggestions = (SUGGESTIONS[sec.key] ?? []).filter(s => !ownedLower.includes(s.toLowerCase()));
            return (
              <div key={sec.key}>
                <p className="label-eyebrow mb-2.5">{sec.label}</p>
                <div className="flex flex-wrap gap-2">
                  {items.map(item => (
                    <button
                      key={item}
                      onClick={() => removeItem(sec.key, item)}
                      aria-label={`Remove ${item}`}
                      className="inline-flex items-center gap-1.5 h-9 pl-3.5 pr-2.5 rounded-full text-[13px] font-medium border transition-all active:scale-[0.94]"
                      style={{
                        background: "var(--ember-chip)",
                        borderColor: "var(--ember-chip)",
                        color: "oklch(0.965 0.018 72)",
                        boxShadow: "0 2px 8px oklch(0 0 0 / 0.28)",
                      }}
                    >
                      {item}
                      <X className="w-3.5 h-3.5 opacity-80" />
                    </button>
                  ))}
                  {suggestions.map(sug => (
                    <button
                      key={sug}
                      onClick={() => addSuggestion(sec.key, sug)}
                      aria-label={`Add ${sug}`}
                      className="inline-flex items-center gap-1.5 h-9 pl-2.5 pr-3.5 rounded-full text-[13px] font-medium bg-bg-elevated border border-border-default text-text-secondary active:scale-[0.94] transition-all"
                    >
                      <Plus className="w-3.5 h-3.5 text-ember-text" />
                      {sug}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Proceed to recipes */}
        <KeyboardAwareFooter className="px-6">
          <EmberButton size="lg" className="w-full" onClick={proceed}>
            Find recipes <ArrowRight className="w-4 h-4" />
          </EmberButton>
        </KeyboardAwareFooter>
      </div>
    </MobileFrame>
  );
}
