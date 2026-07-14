import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { X, Check, Plus } from "lucide-react";
import { MobileFrame } from "@/components/mise/MobileFrame";
import { EmberButton } from "@/components/mise/EmberButton";
import { KeyboardAwareFooter } from "@/components/mise/KeyboardAwareFooter";
import { useSwipeBack } from "@/hooks/use-swipe-back";
import { hapticLight } from "@/lib/haptics";
import { useMise } from "@/store/mise";
import type { Inventory } from "@/store/mise";
import { STAPLE_SECTIONS, APPLIANCE_SECTIONS } from "@/lib/mise-data";
import { CustomItemInput, MASTER_INGREDIENTS, CATEGORY_LABEL, type AddResult } from "./inventory";

export const Route = createFileRoute("/pantry")({ component: PantryScreen });

const GROUPS = [
  { key: "staples" as const, title: "Pantry staples", sections: STAPLE_SECTIONS },
  { key: "appliances" as const, title: "Appliances", sections: APPLIANCE_SECTIONS },
];

const VALID_CATS = ["proteins", "carbs", "vegetables", "fridge", "staples"];

// A focused screen for the assumed basics — pantry staples and appliances —
// opened from the Cook screen. Tap suggestions to toggle, or type to add. Close
// to return to Cook and find a recipe. Everything persists in the kitchen.
function PantryScreen() {
  const navigate = useNavigate();
  const inventory = useMise((s) => s.inventory);
  const toggleItem = useMise((s) => s.toggleItem);
  const setInventory = useMise((s) => s.setInventory);
  const addCustomItem = useMise((s) => s.addCustomItem);
  const addCustomTokenMapping = useMise((s) => s.addCustomTokenMapping);

  const close = () => navigate({ to: "/dump" });
  useSwipeBack(close);

  // Typed items route to their true category; unknowns default to the pantry.
  const onAdd = (item: string, category?: string): AddResult => {
    const lower = item.toLowerCase();
    const cat = ((category && VALID_CATS.includes(category) ? category
      : MASTER_INGREDIENTS[lower]?.category) ?? "staples") as keyof Inventory;
    const list = (inventory[cat] as string[]) ?? [];
    if (!list.map((x) => x.toLowerCase()).includes(lower)) {
      setInventory({ [cat]: [...list, item] } as never);
      addCustomItem(item);
      return { kind: "added", label: CATEGORY_LABEL[cat] };
    }
    return { kind: "duplicate", label: CATEGORY_LABEL[cat] };
  };

  const toggle = (cat: keyof Inventory, item: string) => { hapticLight(); toggleItem(cat as never, item); };

  return (
    <MobileFrame>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 px-6 pt-5">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <h1 className="font-display text-[30px] font-light text-text-primary leading-tight">Pantry &amp; appliances</h1>
              <p className="text-[13px] text-text-secondary mt-1.5 leading-relaxed">
                The basics we assume you have. Tap to add or remove, then close to find a recipe.
              </p>
            </div>
            <button onClick={close} aria-label="Close"
              className="flex-shrink-0 w-10 h-10 -mr-1 rounded-full bg-bg-raised flex items-center justify-center text-text-secondary active:scale-90">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Add box */}
        <div className="flex-shrink-0 px-6 pt-4">
          <CustomItemInput onAdd={onAdd} addMapping={addCustomTokenMapping} />
        </div>

        {/* Suggestions grouped by pantry / appliances */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 pb-4 space-y-7">
          {GROUPS.map((group) => {
            const owned = (inventory[group.key] as string[] | undefined) ?? [];
            const ownedLower = owned.map((x) => x.toLowerCase());
            return (
              <div key={group.key}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary mb-3">{group.title}</p>
                <div className="space-y-4">
                  {group.sections.map((section) => (
                    <div key={section.label}>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-tertiary mb-2">{section.label}</p>
                      <div className="flex flex-wrap gap-2">
                        {section.items.map((item) => {
                          const active = ownedLower.includes(item.toLowerCase());
                          return (
                            <button
                              key={item}
                              onClick={() => toggle(group.key, item)}
                              aria-pressed={active}
                              className={`inline-flex items-center gap-1.5 h-10 rounded-full text-[13px] font-medium border transition-all active:scale-[0.94] ${
                                active ? "pl-4 pr-3" : "pl-2.5 pr-4"
                              }`}
                              style={active ? {
                                background: "var(--ember-chip)",
                                borderColor: "var(--ember-chip)",
                                color: "oklch(0.965 0.018 72)",
                                boxShadow: "0 2px 8px oklch(0 0 0 / 0.28)",
                              } : {
                                background: "var(--bg-elevated)",
                                borderColor: "var(--border-default)",
                                color: "var(--text-secondary)",
                              }}
                            >
                              {active ? (
                                <>{item}<Check className="w-3.5 h-3.5 opacity-90" /></>
                              ) : (
                                <><Plus className="w-3.5 h-3.5 text-ember-text" />{item}</>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Done */}
        <KeyboardAwareFooter className="px-6">
          <EmberButton size="lg" className="w-full" onClick={close}>Done</EmberButton>
        </KeyboardAwareFooter>
      </div>
    </MobileFrame>
  );
}
