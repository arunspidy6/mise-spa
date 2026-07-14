import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, X, Plus, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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

// The food you actually cook with — shown prominently, in cook-priority order.
const PRIMARY: { key: keyof Inventory; label: string }[] = [
  { key: "proteins", label: "Protein" },
  { key: "vegetables", label: "Vegetables" },
  { key: "carbs", label: "Carbs" },
  { key: "fridge", label: "Fridge & extras" },
];

// Assumed / rarely-edited — tucked into a single collapsible at the bottom so
// they don't drown out the ingredients that drive recipes.
const SECONDARY: { key: keyof Inventory; label: string }[] = [
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
  const [basicsOpen, setBasicsOpen] = useState(false);

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
  const basicsCount = (inventory.staples?.length ?? 0) + (inventory.appliances?.length ?? 0);

  // One section's owned chips (filled, removable) then its suggestions (outline,
  // add). Used for both the primary list and inside the basics disclosure.
  const renderSection = (secKey: keyof Inventory, compact = false) => {
    const items = (inventory[secKey] as string[] | undefined) ?? [];
    const ownedLower = items.map(x => x.toLowerCase());
    const suggestions = (SUGGESTIONS[secKey] ?? []).filter(s => !ownedLower.includes(s.toLowerCase()));
    return (
      <div className="flex flex-wrap gap-2">
        {items.map(item => (
          <button
            key={item}
            onClick={() => removeItem(secKey, item)}
            aria-label={`Remove ${item}`}
            className={`inline-flex items-center gap-1.5 rounded-full font-medium border transition-all active:scale-[0.94] ${compact ? "h-8 pl-3 pr-2 text-[12px]" : "h-10 pl-4 pr-2.5 text-[13px]"}`}
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
            onClick={() => addSuggestion(secKey, sug)}
            aria-label={`Add ${sug}`}
            className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-bg-elevated border border-border-default text-text-tertiary active:scale-[0.94] transition-all ${compact ? "h-8 pl-2 pr-3 text-[12px]" : "h-10 pl-2.5 pr-4 text-[13px]"}`}
          >
            <Plus className="w-3.5 h-3.5 text-ember-text" />
            {sug}
          </button>
        ))}
      </div>
    );
  };

  return (
    <MobileFrame>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 px-6 pt-5">
          <button onClick={back}
            className="w-10 h-10 -ml-2 flex items-center justify-center text-text-secondary active:scale-90">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display text-[32px] font-light text-text-primary leading-none mt-2">Your kitchen</h1>
          <p className="text-[13px] text-text-secondary mt-2">
            {itemCount} {itemCount === 1 ? "ingredient" : "ingredients"} · tap to add, × to remove
          </p>
        </div>

        {/* Search / custom add — auto-sorts into the right section */}
        <div className="flex-shrink-0 px-6 pt-4">
          <CustomItemInput onAdd={onAdd} addMapping={addCustomTokenMapping} />
        </div>

        {/* Sections */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 pb-4 space-y-7">
          {PRIMARY.map(sec => {
            const count = (inventory[sec.key] as string[] | undefined)?.length ?? 0;
            return (
              <div key={sec.key}>
                <div className="flex items-baseline gap-2 mb-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">{sec.label}</p>
                  {count > 0 && (
                    <span className="text-[10px] font-mono text-text-tertiary tabular-nums">{count}</span>
                  )}
                </div>
                {renderSection(sec.key)}
              </div>
            );
          })}

          {/* Assumed basics — pantry + appliances, collapsed to keep the view
              focused on the ingredients that actually drive recipes. */}
          <div className="rounded-xl bg-bg-surface border border-border-subtle overflow-hidden">
            <button
              onClick={() => setBasicsOpen(o => !o)}
              aria-expanded={basicsOpen}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:opacity-70 transition"
            >
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-medium text-text-primary leading-tight">Pantry &amp; appliances</span>
                <span className="block text-[12px] text-text-tertiary leading-tight mt-0.5">
                  {basicsCount} assumed on · staples, spices &amp; your cooker
                </span>
              </span>
              <ChevronDown className={`w-4 h-4 text-text-tertiary flex-shrink-0 transition-transform ${basicsOpen ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {basicsOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22 }} className="overflow-hidden"
                >
                  <div className="px-4 pb-4 pt-0.5 space-y-4">
                    {SECONDARY.map(sec => (
                      <div key={sec.key}>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-tertiary mb-2">{sec.label}</p>
                        {renderSection(sec.key, true)}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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
