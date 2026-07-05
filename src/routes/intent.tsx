import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MobileFrame } from "@/components/mise/MobileFrame";
import { KeyboardAwareFooter } from "@/components/mise/KeyboardAwareFooter";
import { EmberButton } from "@/components/mise/EmberButton";
import { IntentCard } from "@/components/mise/IntentCard";
import { RecipeLoaderContent } from "@/components/mise/RecipeLoader";
import { useMise } from "@/store/mise";
import type { IntentPriority, CookSize } from "@/store/mise";

export const Route = createFileRoute("/intent")({ component: IntentSetup });

const PRIORITIES: { id: IntentPriority; emoji: string; label: string; sub: string }[] = [
  { id: "use-up", emoji: "🥬", label: "Use up ingredients", sub: "Cook down what's about to turn" },
  { id: "quick", emoji: "⚡", label: "Quick meal", sub: "On the table fast, low fuss" },
  { id: "comfort", emoji: "🍲", label: "Comfort food", sub: "Warm, hearty, satisfying" },
  { id: "healthy", emoji: "🥗", label: "Healthy", sub: "Light and nourishing" },
  { id: "different", emoji: "✨", label: "Try something different", sub: "Break the weeknight routine" },
];

const SIZES: { id: CookSize; emoji: string; label: string }[] = [
  { id: "1", emoji: "🍽️", label: "Just me" },
  { id: "2", emoji: "👥", label: "2 people" },
  { id: "family", emoji: "👨‍👩‍👧", label: "Family" },
  { id: "meal-prep", emoji: "🥡", label: "Meal prep" },
];

function IntentSetup() {
  const navigate = useNavigate();
  const urgent = useMise((s) => s.urgent);
  const intent = useMise((s) => s.intent);
  const setIntent = useMise((s) => s.setIntent);
  const [thinking, setThinking] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // No ingredients captured yet — send them back to start.
  if (urgent.length === 0) {
    return (
      <MobileFrame>
        <div className="flex-1 flex flex-col items-center justify-center px-8 gap-4 text-center">
          <p className="text-[15px] text-text-secondary">Let's start with what you want to use up.</p>
          <EmberButton onClick={() => navigate({ to: "/" })}>Add ingredients</EmberButton>
        </div>
      </MobileFrame>
    );
  }

  const create = () => {
    setThinking(true);
    // The decision is computed instantly on the next screen; this short beat
    // sells the reasoning and gives the transition somewhere to breathe.
    timer.current = setTimeout(() => navigate({ to: "/decision" }), 1100);
  };

  return (
    <MobileFrame>
      <AnimatePresence>
        {thinking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-bg-base z-50 flex items-center justify-center"
          >
            <RecipeLoaderContent subtitle="Weighing up what works with what you've got…" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 pt-5 pb-4">
          <button
            onClick={() => navigate({ to: "/" })}
            className="w-10 h-10 -ml-2 flex items-center justify-center text-text-secondary active:scale-90"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-3">
            <h1 className="font-display text-[28px] font-light text-text-primary leading-tight">What matters tonight?</h1>
            <p className="text-[13px] text-text-secondary mt-1">Using {urgent.map((u) => u.name).join(", ").toLowerCase()}.</p>
          </motion.div>

          <div className="mt-5 space-y-2.5">
            {PRIORITIES.map((p) => (
              <IntentCard
                key={p.id}
                emoji={p.emoji}
                label={p.label}
                sub={p.sub}
                active={intent.priority === p.id}
                onClick={() => setIntent({ priority: p.id })}
              />
            ))}
          </div>

          <div className="mt-7">
            <p className="label-eyebrow mb-3">Cooking for</p>
            <div className="grid grid-cols-4 gap-2">
              {SIZES.map((s) => {
                const active = intent.size === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setIntent({ size: s.id })}
                    className={`h-[68px] rounded-xl flex flex-col items-center justify-center gap-1 border transition-all active:scale-95 ${
                      active ? "bg-ember-glow border-ember-dim text-ember-text" : "bg-bg-surface border-border-default text-text-secondary"
                    }`}
                  >
                    <span className="text-[18px]">{s.emoji}</span>
                    <span className="text-[11px] font-medium leading-none text-center px-1">{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <KeyboardAwareFooter className="px-6">
          <EmberButton size="lg" className="w-full" onClick={create} disabled={thinking}>
            Create my meal <ArrowRight className="w-4 h-4" />
          </EmberButton>
        </KeyboardAwareFooter>
      </div>
    </MobileFrame>
  );
}
