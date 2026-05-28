import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Plus, X, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MobileFrame } from "@/components/mise/MobileFrame";
import { EmberButton } from "@/components/mise/EmberButton";
import { useMise } from "@/store/mise";
import {
  STAPLE_SECTIONS, PROTEIN_SECTIONS, CARB_SECTIONS,
  VEG_SECTIONS, FRIDGE_SECTIONS, APPLIANCE_SECTIONS,
} from "@/lib/mise-data";

export const Route = createFileRoute("/inventory")({
  validateSearch: (s: Record<string, unknown>) => ({
    from: typeof s.from === "string" ? s.from : undefined,
    step: typeof s.step === "number"
      ? s.step
      : typeof s.step === "string"
        ? parseInt(s.step)
        : undefined,
  }),
  component: InventoryFlow,
});

const STEPS = [
  { key: "staples" as const,    label: "Pantry staples",  title: "What's in your kitchen?",       intro: "Everything in orange is in your kitchen. Tap to remove what you don't have.", mode: "remove" as const, sections: STAPLE_SECTIONS },
  { key: "proteins" as const,   label: "Proteins",         title: "What proteins do you have?",    intro: "Select everything you have right now. This drives your recipes.",            mode: "add" as const,    sections: PROTEIN_SECTIONS },
  { key: "carbs" as const,      label: "Carbs",            title: "Anything carby?",               intro: "Pick what you actually have.",                                              mode: "add" as const,    sections: CARB_SECTIONS },
  { key: "vegetables" as const, label: "Vegetables",       title: "Veg in the fridge or counter?", intro: "Even just a few opens up a lot of options.",                                mode: "add" as const,    sections: VEG_SECTIONS },
  { key: "fridge" as const,     label: "Fridge & extras",  title: "What else is in the fridge?",   intro: "Dairy, sauces, the in-between things.",                                     mode: "add" as const,    sections: FRIDGE_SECTIONS },
  { key: "appliances" as const, label: "Appliances",       title: "What can you cook with?",       intro: "We only suggest recipes you can actually make.",                            mode: "add" as const,    sections: APPLIANCE_SECTIONS },
];

function Chip({ label, active, mode, onClick }: {
  label: string; active: boolean; mode: "add" | "remove"; onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick}
      className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-[13px] font-medium transition-all active:scale-95 border
        ${mode === "remove"
          ? active ? "bg-ember border-ember text-bg-base" : "bg-bg-raised border-border-subtle text-text-tertiary line-through"
          : active ? "bg-ember border-ember text-bg-base" : "bg-bg-raised border-border-default text-text-secondary"
        }`}
    >
      {active && mode === "add" && <CheckCircle2 className="w-3 h-3" />}
      {label}
      {active && mode === "remove" && <X className="w-3 h-3 opacity-50" />}
    </button>
  );
}

function InventoryFlow() {
  const navigate = useNavigate();
  const router = useRouter();
  const { from, step: initStep } = Route.useSearch();
  const inventory = useMise(s => s.inventory);
  const toggleItem = useMise(s => s.toggleItem);
  const finalize = useMise(s => s.finalizeInventory);
  const setInventory = useMise(s => s.setInventory);
  const [step, setStep] = useState(initStep ?? 0);
  const [custom, setCustom] = useState("");

  const cur = STEPS[step];
  const selected = inventory[cur.key] as string[];
  const allItems = cur.sections.flatMap(s => s.items);
  const isLast = step === STEPS.length - 1;
  const selectedCount = selected.filter(i => allItems.includes(i)).length;

  const goBack = () => {
    if (from === "session") navigate({ to: "/session" });
    else if (from === "home") navigate({ to: "/" });
    else if (router.history.length > 1) router.history.back();
    else navigate({ to: "/" });
  };

  const next = () => {
    if (isLast) { finalize(); navigate({ to: "/session" }); }
    else setStep(s => s + 1);
  };

  const addCustom = () => {
    const v = custom.trim();
    if (!v) return;
    const list = inventory[cur.key] as string[];
    if (!list.includes(v)) setInventory({ [cur.key]: [...list, v] } as never);
    setCustom("");
  };

  return (
    <MobileFrame>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-12 pb-3">
          <button onClick={() => step === 0 ? goBack() : setStep(s => s - 1)}
            className="w-11 h-11 -ml-2 flex items-center justify-center text-text-secondary active:scale-90">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-mono text-[10px] text-text-tertiary uppercase tracking-widest">
            Step {step + 1} of {STEPS.length}
          </span>
          <button onClick={() => { finalize(); goBack(); }}
            className="w-11 h-11 -mr-2 flex items-center justify-center text-text-tertiary active:scale-90">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-4 mb-4">
          <div className="h-[3px] bg-bg-overlay rounded-full flex gap-1 overflow-hidden">
            {STEPS.map((_, i) => (
              <div key={i} className={`flex-1 rounded-full transition-colors ${i <= step ? "bg-ember" : "bg-bg-overlay"}`} />
            ))}
          </div>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div key={step}
            initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.2 }}
            className="flex-1 overflow-y-auto px-4 pb-8">

            <span className="label-eyebrow text-ember-text">{cur.label}</span>
            <h1 className="font-display text-[28px] font-light text-text-primary mt-2 leading-tight">{cur.title}</h1>

            {cur.mode === "remove" && (
              <div className="mt-4">
                <div className="rounded-xl bg-bg-raised border border-border-subtle px-4 py-3 flex gap-3">
                  <span className="text-base mt-0.5">👇</span>
                  <div>
                    <p className="text-[13px] font-semibold text-text-primary">Tap to remove what you don't have</p>
                    <p className="text-[12px] text-text-secondary mt-0.5 leading-relaxed">Everything in orange is assumed to be in your kitchen.</p>
                  </div>
                </div>

              </div>
            )}

            {cur.mode === "add" && (
              <p className="text-[14px] text-text-secondary mt-2 leading-relaxed">{cur.intro}</p>
            )}

            {cur.key === "proteins" && (
              <div className="mt-3 rounded-lg bg-ember-glow border border-ember-dim px-4 py-3">
                <p className="text-[13px] font-semibold text-ember-text">Most important step</p>
                <p className="text-[12px] text-text-secondary mt-0.5">Your protein drives which recipes we suggest.</p>
              </div>
            )}

            <p className="text-[11px] text-text-tertiary mt-4 mb-3">
              {cur.mode === "remove"
                ? `${selectedCount} of ${allItems.length} in your kitchen`
                : selectedCount > 0 ? `${selectedCount} selected` : "Tap to select"
              }
            </p>

            {/* Categorised sections */}
            <div className="flex flex-col gap-5">
              {cur.sections.map(section => (
                <div key={section.label}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-tertiary mb-2">
                    {section.label}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {section.items.map(item => (
                      <Chip key={item} label={item}
                        active={selected.includes(item)}
                        mode={cur.mode}
                        onClick={() => toggleItem(cur.key, item)} />
                    ))}
                  </div>
                </div>
              ))}

              {selected.filter(s => !allItems.includes(s)).length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-tertiary mb-2">Added by you</p>
                  <div className="flex flex-wrap gap-2">
                    {selected.filter(s => !allItems.includes(s)).map(c => (
                      <Chip key={c} label={c} active mode={cur.mode} onClick={() => toggleItem(cur.key, c)} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {cur.key !== "appliances" && cur.key !== "staples" && (
              <div className="mt-5 flex gap-2">
                <input value={custom} onChange={e => setCustom(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addCustom()}
                  placeholder="Something not listed? Add it…"
                  className="flex-1 h-11 bg-bg-surface border border-border-subtle rounded-xl px-4 text-[14px] text-text-primary placeholder:text-text-tertiary focus:border-ember focus:outline-none" />
                <button onClick={addCustom}
                  className="w-11 h-11 rounded-xl bg-bg-raised border border-border-default flex items-center justify-center text-text-secondary active:scale-95">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}

            {cur.key === "proteins" && selectedCount === 0 && (
              <div className="mt-4 rounded-lg bg-bg-surface border border-border-subtle px-4 py-3">
                <p className="text-[12px] text-text-secondary leading-relaxed">
                  <span className="text-text-primary font-medium">No protein?</span>{" "}
                  That's fine — we have recipes for eggs, chickpeas and lentils too.
                </p>
              </div>
            )}

            {cur.key === "staples" && (
              <p className="mt-5 text-[11px] text-text-tertiary italic">Your pantry selection is saved between sessions.</p>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Sticky CTA — always visible, never scrolls away */}
        <div className="flex-shrink-0 px-4 pb-10 pt-3 bg-bg-base border-t border-border-subtle safe-area-bottom">
          <EmberButton size="lg" className="w-full" onClick={next}>
            {isLast ? "Done — show me recipes" : "Next"}
            <ArrowRight className="w-4 h-4" />
          </EmberButton>
        </div>
      </div>
    </MobileFrame>
  );
}
