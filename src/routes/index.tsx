import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, ArrowRight, X, Plus } from "lucide-react";
import { MobileFrame } from "@/components/mise/MobileFrame";
import { KeyboardAwareFooter } from "@/components/mise/KeyboardAwareFooter";
import { EmberButton } from "@/components/mise/EmberButton";
import { useMise } from "@/store/mise";
import { toUrgent } from "@/lib/pantry-model";

export const Route = createFileRoute("/")({ component: Capture });

// Ingredients people commonly have kicking around — one tap to add. Deliberately
// NOT a pantry list: no salt, oil, spices. Just things worth building a meal on.
const SUGGESTIONS = ["Chicken", "Eggs", "Pasta", "Rice", "Potatoes", "Tomatoes", "Mince", "Salmon", "Spinach", "Chickpeas", "Carrots", "Cheese"];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Late night";
}

function Capture() {
  const navigate = useNavigate();
  const urgent = useMise((s) => s.urgent);
  const addUrgent = useMise((s) => s.addUrgent);
  const removeUrgent = useMise((s) => s.removeUrgent);
  const [draft, setDraft] = useState("");
  const [voiceHint, setVoiceHint] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const has = (name: string) => urgent.some((u) => u.name.toLowerCase().trim() === name.toLowerCase().trim());

  const commit = (raw: string) => {
    // Free text can be a whole list — "chicken, potatoes and carrots".
    raw
      .split(/[,\n]|(?:\band\b)/i)
      .map((s) => s.trim())
      .filter((s) => s.length > 1)
      .forEach((name) => addUrgent(toUrgent(name)));
    setDraft("");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (draft.trim()) commit(draft);
    } else if (e.key === "Backspace" && !draft && urgent.length) {
      removeUrgent(urgent[urgent.length - 1].name);
    }
  };

  const toggleSuggestion = (name: string) => {
    if (has(name)) removeUrgent(name);
    else addUrgent(toUrgent(name));
  };

  const proceed = () => {
    if (draft.trim()) commit(draft);
    if (urgent.length === 0 && !draft.trim()) return;
    navigate({ to: "/intent" });
  };

  const canProceed = urgent.length > 0 || draft.trim().length > 1;

  return (
    <MobileFrame>
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 pt-14 pb-4">
          {/* Identity */}
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
            <span className="label-eyebrow">{greeting()}</span>
            <h1 className="font-display text-[30px] font-light text-text-primary leading-[1.15] mt-2">
              What do you want to <span className="text-ember italic">use up?</span>
            </h1>
            <p className="text-[14px] text-text-secondary mt-2 leading-relaxed">
              Just name a few things. We'll assume the everyday staples — no need to list your whole kitchen.
            </p>
          </motion.div>

          {/* Capture field */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="mt-6 rounded-2xl bg-bg-surface border border-border-default focus-within:border-ember-dim transition-colors p-3"
          >
            {urgent.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                <AnimatePresence initial={false}>
                  {urgent.map((u) => (
                    <motion.button
                      key={u.name}
                      layout
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      onClick={() => removeUrgent(u.name)}
                      className="inline-flex items-center gap-1.5 h-8 pl-3 pr-2 rounded-full bg-ember-glow border border-ember-dim text-ember-text active:scale-95"
                    >
                      <span className="text-[13px] font-medium capitalize">{u.name}</span>
                      <X className="w-3.5 h-3.5 opacity-70" />
                    </motion.button>
                  ))}
                </AnimatePresence>
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                onBlur={() => draft.trim() && commit(draft)}
                enterKeyHint="done"
                autoCapitalize="none"
                placeholder={urgent.length ? "Add another…" : "Chicken, potatoes, carrots…"}
                className="flex-1 h-10 bg-transparent text-[16px] text-text-primary placeholder:text-text-tertiary outline-none"
              />
              <button
                aria-label="Voice input"
                onClick={() => {
                  setVoiceHint(true);
                  setTimeout(() => setVoiceHint(false), 2200);
                  inputRef.current?.focus();
                }}
                className="w-10 h-10 rounded-full bg-bg-raised border border-border-default flex items-center justify-center text-text-secondary active:scale-90 flex-shrink-0"
              >
                <Mic className="w-4.5 h-4.5" />
              </button>
            </div>
            <AnimatePresence>
              {voiceHint && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-[11px] text-text-tertiary pt-2 overflow-hidden"
                >
                  🎙️ Voice capture is coming soon — type your ingredients for now.
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Quick add */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }} className="mt-6">
            <span className="label-eyebrow">Or tap what you've got</span>
            <div className="flex flex-wrap gap-2 mt-3">
              {SUGGESTIONS.map((name) => {
                const active = has(name);
                return (
                  <button
                    key={name}
                    onClick={() => toggleSuggestion(name)}
                    className={`inline-flex items-center gap-1 h-9 px-3.5 rounded-full border text-[13px] transition-all active:scale-95 ${
                      active
                        ? "bg-ember-glow border-ember-dim text-ember-text font-medium"
                        : "bg-bg-surface border-border-default text-text-secondary"
                    }`}
                  >
                    {!active && <Plus className="w-3.5 h-3.5 opacity-60" />}
                    {name}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </div>

        <KeyboardAwareFooter className="px-6">
          <EmberButton size="lg" className="w-full" onClick={proceed} disabled={!canProceed}>
            Find my meal <ArrowRight className="w-4 h-4" />
          </EmberButton>
          {!canProceed && (
            <p className="text-center text-[11px] text-text-tertiary pt-2">Add at least one ingredient to begin.</p>
          )}
        </KeyboardAwareFooter>
      </div>
    </MobileFrame>
  );
}
