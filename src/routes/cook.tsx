import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, ArrowRight, X, Play, Pause, Mic, MicOff, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MobileFrame } from "@/components/mise/MobileFrame";
import { KeyboardAwareFooter } from "@/components/mise/KeyboardAwareFooter";
import { useMise } from "@/store/mise";

export const Route = createFileRoute("/cook")({ component: CookMode });

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function playTimerDone() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const beep = (t: number, freq: number, dur: number) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = freq;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.5, t + 0.01);
      g.gain.linearRampToValueAtTime(0, t + dur);
      o.start(t); o.stop(t + dur + 0.05);
    };
    beep(ctx.currentTime, 880, 0.18);
    beep(ctx.currentTime + 0.28, 880, 0.18);
    beep(ctx.currentTime + 0.56, 1046, 0.45);
    setTimeout(() => ctx.close().catch(() => {}), 3000);
  } catch {}
  navigator.vibrate?.([150, 80, 150, 80, 400]);
}

function hapticStep() { navigator.vibrate?.([30]); }
function hapticTimerStart() { navigator.vibrate?.([60, 40, 60]); }

const SR = typeof window !== "undefined"
  ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  : null;

// On iOS, Chrome is a WebKit wrapper — Apple doesn't expose SpeechRecognition
// to third-party browsers. Only Safari on iOS gets the API.
const IS_IOS = typeof navigator !== "undefined" &&
  /iP(hone|ad|od)/.test(navigator.userAgent);
const VOICE_UNAVAILABLE_MSG = IS_IOS && !SR
  ? "Voice works in Safari on iOS — Chrome doesn't have mic access here."
  : "Voice isn't available in this browser.";

type TimerState = { remaining: number; total: number; running: boolean; done: boolean; completedAt?: number; endsAt?: number };

const TIMERS_KEY = "mise_timers_v1";

function saveTimers(timers: Record<number, TimerState>) {
  try { localStorage.setItem(TIMERS_KEY, JSON.stringify(timers)); } catch {}
}

function loadTimers(): Record<number, TimerState> {
  try {
    const raw = localStorage.getItem(TIMERS_KEY);
    if (!raw) return {};
    const stored: Record<number, TimerState> = JSON.parse(raw);
    const now = Date.now();
    const result: Record<number, TimerState> = {};
    for (const [k, t] of Object.entries(stored)) {
      const idx = parseInt(k);
      if (t.running && t.endsAt) {
        const remaining = Math.max(0, Math.round((t.endsAt - now) / 1000));
        if (remaining === 0) {
          result[idx] = { ...t, running: false, done: true, remaining: 0, completedAt: t.endsAt };
        } else {
          result[idx] = { ...t, remaining };
        }
      } else {
        result[idx] = t;
      }
    }
    return result;
  } catch { return {}; }
}

function swSchedule(stepIdx: number, endsAt: number, label: string) {
  navigator.serviceWorker?.ready.then(reg => {
    reg.active?.postMessage({ type: "SCHEDULE", stepIdx, endsAt, label });
  }).catch(() => {});
}

function swCancel(stepIdx: number) {
  navigator.serviceWorker?.ready.then(reg => {
    reg.active?.postMessage({ type: "CANCEL", stepIdx });
  }).catch(() => {});
}

async function registerSW() {
  if (!("serviceWorker" in navigator)) return;
  try { await navigator.serviceWorker.register("/sw.js"); } catch {}
}

function fmtElapsed(completedAt: number): string {
  const mins = Math.floor((Date.now() - completedAt) / 60000);
  if (mins < 1) return "just now";
  if (mins === 1) return "1 min ago";
  return `${mins} min ago`;
}

// ── Prep derivation ─────────────────────────────────────────────────────────
// Turns a recipe's own step text into a precise prep note per ingredient —
// e.g. "Onion" + the steps → "finely diced". Falls back to sensible defaults
// for common aromatics/veg when a recipe doesn't spell the cut out.

const PREP_VERBS: Record<string, string> = {
  dice: "diced", slice: "sliced", chop: "chopped", mince: "minced",
  grate: "grated", crush: "crushed", smash: "smashed", cut: "cut",
  peel: "peeled", halve: "halved", quarter: "quartered", cube: "cubed",
  shred: "shredded", julienne: "julienned", crumble: "crumbled",
  beat: "beaten", whisk: "whisked", trim: "trimmed", devein: "deveined",
};

// Default prep for common items — used only when the steps don't describe it.
const DEFAULT_PREP: Record<string, string> = {
  "red onion": "finely sliced", onion: "finely diced", shallot: "finely sliced",
  "spring onion": "sliced", garlic: "minced", ginger: "grated", chilli: "finely chopped",
  carrot: "diced", "sweet potato": "cut into chunks", potato: "cut into chunks",
  tomato: "roughly chopped", pepper: "sliced", mushroom: "sliced", courgette: "sliced",
  aubergine: "cubed", broccoli: "cut into florets", cauliflower: "cut into florets",
  spinach: "washed", kale: "stalks removed", leek: "sliced", celery: "diced",
  lemon: "cut into wedges", lime: "cut into wedges", parsley: "finely chopped",
  coriander: "finely chopped", basil: "torn",
};

// Pantry / measure-and-pour items — never need a knife prep step.
const NO_PREP = ["oil","salt","pepper","sugar","flour","stock","soy sauce","vinegar",
  "honey","water","cumin","paprika","spice","powder","sauce","paste","seeds","milk","cream","rice"];

function singular(w: string): string {
  if (w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.endsWith("oes")) return w.slice(0, -2);
  if (/(ch|sh|s|x|z)es$/.test(w)) return w.slice(0, -2);
  if (w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

// The searchable singular noun for an ingredient ("Cherry tomatoes" → "tomato").
function searchNoun(name: string): string {
  const n = name.toLowerCase().replace(/\(.*?\)/g, "")
    .replace(/\b(fresh|large|small|medium|ripe|whole)\b/g, "").replace(/\s+/g, " ").trim();
  const words = n.split(" ").filter(Boolean);
  return singular(words[words.length - 1] || n);
}

// Derive a precise prep note for an ingredient from the recipe steps.
function derivePrepNote(name: string, steps: any[]): string | null {
  const low = name.toLowerCase();
  if (NO_PREP.some(k => low.includes(k))) return null;
  const noun = searchNoun(name);
  if (!noun || noun.length < 3) return null;

  const verbAlt = Object.keys(PREP_VERBS).join("|");
  // verb (with optional adverb) appearing just before the noun, not crossing an "and"
  const re = new RegExp(
    `(finely|thinly|roughly|coarsely)?\\s*(${verbAlt})\\w*\\s+((?:(?!\\band\\b)[^.,;]){0,25}?)\\b${noun}s?\\b([^.,;]{0,40})`,
    "i"
  );
  for (const s of steps || []) {
    const text = (s.instruction || "").toLowerCase();
    const m = text.match(re);
    if (!m) continue;
    let adverb = (m[1] || "").trim();
    const verb = PREP_VERBS[m[2].toLowerCase()] ?? (m[2].toLowerCase() + "ed");
    const after = m[4] || "";
    if (!adverb) {
      const a = after.match(/^\s*(thinly|finely|roughly|coarsely)\b/);
      if (a) adverb = a[1];
    }
    // Capture the exact cut shape (and size) so the prep note matches the
    // steps — "sliced into 1cm strips", not a vague "sliced" the cook reads as
    // cubes. Look across the whole step, with or without an "into".
    const SHAPES = "chunks?|cubes?|strips?|pieces?|wedges?|rounds?|batons?|florets?|matchsticks?";
    const shaped = text.match(
      new RegExp(`(\\d+\\s?cm\\s*(?:thick|thin)?\\s*)?(thin|thick|small|large|bite-?sized)?\\s*\\b(${SHAPES})\\b`, "i")
    );
    if (shaped) {
      const sizeOrDesc = (shaped[1] || shaped[2] || "").trim();
      const phrase = `${sizeOrDesc ? sizeOrDesc + " " : ""}${shaped[3]}`.replace(/\s+/g, " ").trim();
      return `${verb} into ${phrase}`;
    }
    return adverb ? `${adverb} ${verb}` : verb;
  }
  for (const key of Object.keys(DEFAULT_PREP)) {
    if (low.includes(key)) return DEFAULT_PREP[key];
  }
  return null;
}

const capFirst = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

// spoken number → 0-based step index
const WORD_NUM: Record<string,number> = {
  one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,
  first:1,second:2,third:3,fourth:4,fifth:5,
};
function extractStepTarget(text: string): number | null {
  const d = text.match(/(?:timer|step)\s+(\d+)/);
  if (d) return parseInt(d[1]) - 1;
  for (const [w, n] of Object.entries(WORD_NUM))
    if (new RegExp(`\\b${w}\\b`).test(text)) return n - 1;
  return null;
}

// ── Prep Screen ────────────────────────────────────────────────────────────
function PrepScreen({ recipe, onStart, onBack }: { recipe: any; onStart: () => void; onBack: () => void }) {
  const ings: any[] = recipe.ingredients ?? [];
  const steps: any[] = recipe.steps ?? [];
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [showWarn, setShowWarn] = useState(false);
  // Derive a precise prep note per ingredient from the recipe's own steps.
  const prepItems: any[] = [];
  const grabItems: any[] = [];
  ings.forEach((ing) => {
    // A swapped-out ingredient (not in the kitchen, but with a suggested
    // substitute) isn't something to prep — the user isn't using the original.
    // List it under "grab" with the substitute instead of a prep instruction.
    if (ing.inInventory === false && ing.substituteNote) {
      grabItems.push(ing);
      return;
    }
    const prep = derivePrepNote(ing.name, steps);
    if (prep) prepItems.push({ ...ing, prep });
    else grabItems.push(ing);
  });
  const toggle = (i: number) =>
    setChecked(p => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n; });
  const allDone = prepItems.length > 0 && prepItems.every((_, i) => checked.has(i));
  const remaining = prepItems.length - checked.size;

  // Guard "Start cooking": if prep items are still unchecked, confirm first.
  const attemptStart = () => {
    if (prepItems.length > 0 && !allDone) setShowWarn(true);
    else onStart();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 340, damping: 30 }}
      className="absolute inset-0 bg-bg-base z-50 flex flex-col"
    >
      {/* Header with back-to-recipe arrow */}
      <div className="flex-shrink-0 flex items-center px-4 pt-5 pb-0">
        <button
          onClick={onBack}
          className="text-[12px] text-text-secondary font-mono active:opacity-70 h-10 px-2 flex items-center gap-1 -ml-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Recipe
        </button>
      </div>
      <div className="flex-shrink-0 px-5 pt-2 pb-4">
        <p className="label-eyebrow mb-1">Before you start</p>
        <h2 className="font-display text-[26px] font-light text-text-primary">Mise en place</h2>
        <p className="text-[13px] text-text-secondary mt-1.5 leading-relaxed">
          Prep these before you start. Interruptions mid-cook will slow you down.
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 space-y-5 pb-4">
        {prepItems.length > 0 && (
          <div>
            <p className="label-eyebrow mb-2.5">Needs prep</p>
            <div className="space-y-2">
              {prepItems.map((ing, i) => {
                const done = checked.has(i);
                return (
                  <motion.button key={i} onClick={() => toggle(i)} layout
                    className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl border transition-colors active:scale-[0.99]
                      ${done ? "bg-success/10 border-success/30" : "bg-bg-surface border-border-subtle"}`}
                  >
                    <motion.div animate={done ? { scale: [1, 1.25, 1] } : {}}
                      className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center transition-colors
                        ${done ? "bg-success border-success" : "border-border-default"}`}
                    >
                      {done && <span className="text-bg-base text-[9px] font-bold leading-none">✓</span>}
                    </motion.div>
                    <div className="flex-1 text-left min-w-0">
                      <p className={`text-[13px] font-medium leading-tight transition-colors
                        ${done ? "line-through text-success/70" : "text-text-primary"}`}>
                        {ing.name}
                      </p>
                      <p className={`text-[12px] leading-tight mt-0.5 transition-colors
                        ${done ? "text-success/50 line-through" : "text-ember-text"}`}>
                        {capFirst(ing.prep)}
                      </p>
                    </div>
                    <span className="text-[11px] text-text-tertiary font-mono text-right leading-snug whitespace-normal break-words flex-shrink-0 max-w-[42%] mt-0.5">{ing.quantity}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}
        {grabItems.length > 0 && (
          <div>
            <p className="label-eyebrow mb-2.5">{prepItems.length > 0 ? "Also grab" : "Gather these"}</p>
            <div className="bg-bg-surface border border-border-subtle rounded-xl overflow-hidden divide-y divide-border-subtle">
              {grabItems.map((ing, i) => (
                <div key={i} className="flex items-start justify-between gap-3 px-4 py-2.5">
                  <span className="text-[13px] text-text-secondary flex-shrink-0">{ing.name}</span>
                  <span className={`text-[11px] font-mono text-right leading-snug whitespace-normal break-words max-w-[55%] ${ing.substituteNote ? "text-ember-text" : "text-text-tertiary"}`}>
                    {ing.substituteNote ? `use ${ing.substituteNote}` : ing.quantity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        {ings.length === 0 && (
          <p className="text-center text-[13px] text-text-tertiary py-10">No ingredients listed.</p>
        )}
      </div>

      <KeyboardAwareFooter>
        {prepItems.length > 0 && !allDone && (
          <p className="text-[11px] text-text-tertiary text-center mb-2.5">
            {remaining} item{remaining !== 1 ? "s" : ""} still to prep.
          </p>
        )}
        <button onClick={attemptStart}
          className="w-full h-14 rounded-xl btn-ember text-[15px] font-semibold active:scale-[0.98] transition">
          {allDone ? "All prepped! Start cooking" : "Start cooking"}
        </button>
      </KeyboardAwareFooter>

      {/* ── Unprepped-items confirmation sheet ──────────────────────────── */}
      <AnimatePresence>
        {showWarn && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm flex items-end z-50"
            onClick={() => setShowWarn(false)}
          >
            <motion.div
              initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
              transition={{ type: "spring", stiffness: 360, damping: 30 }}
              className="w-full bg-bg-surface rounded-t-3xl p-8 pb-safe-lg"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-12 h-1 bg-border-default rounded-full mx-auto mb-6" />
              <div className="text-center mb-6">
                <span className="text-4xl block">🔪</span>
                <h3 className="font-display text-[22px] font-light text-text-primary mt-3">
                  {remaining} item{remaining !== 1 ? "s" : ""} still need{remaining === 1 ? "s" : ""} prepping
                </h3>
                <p className="text-[13px] text-text-secondary mt-2 leading-relaxed">
                  Prepping now keeps the cook smooth — but you can sort it as you go.
                </p>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => setShowWarn(false)}
                  className="w-full h-14 rounded-xl btn-ember text-[15px] font-semibold active:scale-[0.98] transition"
                >
                  Let me prep first
                </button>
                <button
                  onClick={() => { setShowWarn(false); onStart(); }}
                  className="w-full h-14 rounded-xl bg-bg-raised border border-border-default text-text-primary text-[14px] active:scale-[0.98] transition"
                >
                  Continue anyway
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Voice Waveform ─────────────────────────────────────────────────────────
// Bars animate only when actual audio energy is detected via AnalyserNode.
// audioLevels: 0-1 per bar, updated at ~30fps from microphone amplitude.
function VoiceWaveform({ levels }: { levels: number[] }) {
  return (
    <div className="flex items-center gap-[3px] h-5">
      {levels.map((lvl, i) => (
        <motion.div
          key={i}
          animate={{ scaleY: Math.max(0.15, lvl) }}
          transition={{ duration: 0.06, ease: "easeOut" }}
          className="w-[3px] rounded-full bg-ember origin-center"
          style={{ height: 20 }}
        />
      ))}
    </div>
  );
}

// ── Voice Hint — intent-based, not prescriptive ───────────────────────────
function VoiceHintOverlay({ onDismiss }: { onDismiss: () => void }) {
  const CMDS = [
    { intent: "Go forward",       examples: "next · continue · move on",        icon: "→" },
    { intent: "Go back",          examples: "back · previous · go back",         icon: "←" },
    { intent: "Start timer",      examples: "start timer · timer · count down",  icon: "⏱" },
    { intent: "Pause / Resume",   examples: "pause · resume · stop timer",       icon: "⏸" },
    { intent: "Read step aloud",  examples: "repeat · read it · say again",      icon: "🔊" },
    { intent: "Finish cooking",   examples: "finish · all done · done cooking",  icon: "✓" },
  ];
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 bg-bg-base/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center px-8"
      onClick={onDismiss}
    >
      <motion.div
        initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 18, delay: 0.05 }}
        className="w-16 h-16 rounded-full bg-ember flex items-center justify-center mb-5 shadow-[0_0_24px_oklch(0.520_0.178_35_/_0.5)]"
      >
        <Mic className="w-7 h-7 text-bg-base" />
      </motion.div>
      <motion.h2
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 26, delay: 0.1 }}
        className="font-display text-[22px] font-light text-text-primary text-center mb-1"
      >
        Speak naturally
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.18 }}
        className="text-[13px] text-text-secondary text-center mb-6 leading-snug"
      >
        Anything that means the intent works — these are just examples.
      </motion.p>
      <div className="w-full space-y-2">
        {CMDS.map((cmd, i) => (
          <motion.div
            key={cmd.intent}
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 28, delay: 0.2 + i * 0.07 }}
            className="flex items-center gap-3 bg-bg-raised/80 border border-border-subtle rounded-xl px-4 py-3"
          >
            <span className="text-[18px] w-7 text-center flex-shrink-0">{cmd.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-text-primary leading-none mb-0.5">{cmd.intent}</p>
              <p className="text-[11px] text-text-tertiary font-mono leading-snug">{cmd.examples}</p>
            </div>
          </motion.div>
        ))}
      </div>
      <motion.p
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.72 }}
        className="text-[12px] text-text-tertiary text-center mt-5"
      >
        Tap anywhere to dismiss
      </motion.p>
    </motion.div>
  );
}

// ── Floating Timer Row ─────────────────────────────────────────────────────
// Horizontal scrollable row of pills, left-to-right, above nav buttons.
// Tap any pill → bottom sheet modal with timer details (no navigation).
// Handles 1-5+ timers without blocking content.
function FloatingTimerRow({
  timers, steps, currentStep, onOpenModal,
}: {
  timers: Record<number, TimerState>; steps: any[];
  currentStep: number; onOpenModal: (idx: number) => void;
}) {
  const active = Object.entries(timers)
    .filter(([k]) => parseInt(k) !== currentStep)
    .sort(([a], [b]) => parseInt(a) - parseInt(b));

  if (active.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ type: "spring", stiffness: 380, damping: 26 }}
      className="flex-shrink-0 px-4 pb-2"
    >
      {/* Count row — always tells the user how many timers exist */}
      <div className="flex items-center justify-between mb-1.5 px-0.5">
        <p className="text-[10px] font-mono text-text-tertiary">
          {active.length} timer{active.length !== 1 ? "s" : ""}
        </p>
        {active.length > 2 && (
          <p className="text-[10px] font-mono text-text-tertiary">swipe →</p>
        )}
      </div>
      {/* Scrollable row — left to right, no wrap */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {active.map(([key, t]) => {
          const idx = parseInt(key);
          const s = steps[idx];
          const words = s?.instruction?.split(" ") ?? [];
          const label = words.slice(0, 3).join(" ") + (words.length > 3 ? "…" : "");
          const urgent = t.remaining < 30 && t.running && !t.done;

          const progress = t.total > 0 ? (t.total - t.remaining) / t.total : 0;

          return (
            <motion.button
              key={key}
              layout
              onClick={() => onOpenModal(idx)}
              className={`relative flex-shrink-0 flex items-center gap-2 pl-0 pr-3 py-1.5 rounded-full
                border active:scale-95 transition-transform shadow-[0_2px_10px_rgba(0,0,0,0.45)] overflow-hidden
                ${t.done
                  ? "bg-success/15 border-success/40"
                  : urgent
                    ? "bg-warning/15 border-warning/40"
                    : "bg-bg-raised border-ember-dim/50"
                }`}
            >
              {/* Progress fill — grows left→right as time elapses */}
              {!t.done && (
                <div
                  className={`absolute left-0 top-0 bottom-0 rounded-full pointer-events-none
                    ${urgent ? "bg-warning/25" : "bg-ember/20"}`}
                  style={{ width: `${progress * 100}%`, transition: "width 0.9s linear" }}
                />
              )}

              {/* Colour accent strip */}
              <div className={`relative z-10 w-1 self-stretch rounded-full flex-shrink-0 ${
                t.done ? "bg-success" : urgent ? "bg-warning" : "bg-ember"
              }`} />

              {/* Timer value */}
              <span className={`relative z-10 font-mono text-[13px] font-semibold tabular-nums leading-none ${
                t.done ? "text-success" : urgent ? "text-warning" : "text-ember"
              }`}>
                {t.done ? (t.completedAt ? fmtElapsed(t.completedAt) : "Done!") : fmt(t.remaining)}
              </span>

              {/* Dot separator */}
              <span className="relative z-10 text-text-tertiary text-[10px]">·</span>

              {/* Step label */}
              <span className="relative z-10 text-[11px] text-text-primary leading-none max-w-[100px] truncate">
                {label}
              </span>

              {/* Pulse dot when running */}
              {t.running && !t.done && (
                <motion.div
                  animate={{ opacity: [1, 0.2, 1] }}
                  transition={{ duration: 1.1, repeat: Infinity }}
                  className={`relative z-10 w-1.5 h-1.5 rounded-full flex-shrink-0 ml-0.5 ${
                    urgent ? "bg-warning" : "bg-ember"
                  }`}
                />
              )}
            </motion.button>
          );
        })}
      </div>

    </motion.div>
  );
}

// ── Timer Detail Modal ─────────────────────────────────────────────────────
// Bottom sheet showing one timer's details. No navigation.
function TimerModal({
  timerIdx, timers, steps, onClose, onToggle, onDismiss,
}: {
  timerIdx: number | null; timers: Record<number, TimerState>;
  steps: any[]; onClose: () => void;
  onToggle: (idx: number) => void;
  onDismiss: (idx: number) => void;
}) {
  if (timerIdx === null) return null;
  const t = timers[timerIdx];
  if (!t) return null;
  const s = steps[timerIdx];
  const urgent = t.remaining < 30 && t.running && !t.done;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 360, damping: 30 }}
        onClick={e => e.stopPropagation()}
        className="w-full bg-bg-surface rounded-t-3xl px-6 pt-6 pb-safe-lg"
      >
        <div className="w-10 h-1 bg-border-default rounded-full mx-auto mb-6" />

        {/* Step info */}
        <div className="mb-5">
          <p className="label-eyebrow mb-1">Step {timerIdx + 1}</p>
          <p className="text-[15px] text-text-primary leading-snug">{s?.instruction}</p>
        </div>

        {/* Timer display with progress fill */}
        {(() => {
          const progress = t.total > 0 ? (t.total - t.remaining) / t.total : 0;
          return (
            <div className={`relative rounded-xl border p-5 flex items-center justify-between mb-5 overflow-hidden ${
              t.done ? "bg-success/10 border-success"
              : urgent ? "bg-warning/10 border-warning"
              : t.running ? "bg-bg-raised border-ember-dim"
              : "bg-bg-raised border-border-default"
            }`}>
              {!t.done && (
                <div
                  className={`absolute left-0 top-0 bottom-0 pointer-events-none ${urgent ? "bg-warning/15" : "bg-ember/12"}`}
                  style={{ width: `${progress * 100}%`, transition: "width 0.9s linear" }}
                />
              )}
              <div className="relative z-10">
                <p className="label-eyebrow mb-1">
                  {t.done ? "✓ Timer finished" : t.running ? "Running" : "Paused"}
                </p>
                <p className={`font-mono text-[48px] leading-none font-medium ${
                  t.done ? "text-success" : urgent ? "text-warning" : "text-ember"
                }`}>
                  {t.done
                    ? (t.completedAt ? fmtElapsed(t.completedAt) : "Done!")
                    : fmt(t.remaining)}
                </p>
              </div>
              {t.done ? (
                <button
                  onClick={() => onToggle(timerIdx)}
                  className="relative z-10 h-12 px-5 rounded-xl border border-border-default bg-bg-raised text-text-secondary text-[14px] font-medium active:scale-95 transition flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />Start again
                </button>
              ) : (
                <button
                  onClick={() => onToggle(timerIdx)}
                  className="relative z-10 h-12 px-5 rounded-xl btn-ember text-[14px] font-semibold active:scale-95 transition flex items-center gap-2"
                >
                  {t.running
                    ? <><Pause className="w-4 h-4" />Pause</>
                    : <><Play className="w-4 h-4" />Resume</>}
                </button>
              )}
            </div>
          );
        })()}

        <button
          onClick={onClose}
          className="w-full h-12 rounded-xl bg-bg-raised border border-border-default text-text-secondary text-[14px] active:scale-95 transition"
        >
          Back to cooking
        </button>

        {/* Dismiss — only when done, frees up the timer bar */}
        {t.done && (
          <button
            onClick={() => onDismiss(timerIdx!)}
            className="w-full h-11 mt-2 rounded-xl border border-border-subtle text-text-tertiary text-[13px] active:scale-95 transition flex items-center justify-center gap-2"
          >
            <X className="w-3.5 h-3.5" /> Clear this timer
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}

// ── Cook Mode ──────────────────────────────────────────────────────────────
function CookMode() {
  const navigate = useNavigate();
  const recipe = useMise(s => s.recipe);
  const addHistory = useMise(s => s.addHistory);

  const [step, setStep] = useState(0);
  const [timers, setTimers] = useState<Record<number, TimerState>>(() => loadTimers());
  const [prepDone, setPrepDone] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showHint, setShowHint] = useState(() => !localStorage.getItem("mise_hint_v4"));
  const [showTimerPrompt, setShowTimerPrompt] = useState(false);
  const [pendingStep, setPendingStep] = useState<number | null>(null);
  const [showFinish, setShowFinish] = useState(false);
  const [showAchieve, setShowAchieve] = useState(false);
  const [timerModalIdx, setTimerModalIdx] = useState<number | null>(null);
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceHint, setVoiceHint] = useState(false);
  // First-time discovery nudge — shown once after the nav hint clears
  const [voicePromo, setVoicePromo] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<"idle"|"listening"|"heard">("idle");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  // Real mic amplitude levels for waveform — 5 bars, 0-1
  const [audioLevels, setAudioLevels] = useState([0.15, 0.15, 0.15, 0.15, 0.15]);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCommandRef = useRef<string>("");
  const lastCommandTimeRef = useRef<number>(0);

  // Always-fresh refs for voice callbacks
  const stepRef = useRef(step);
  const timersRef = useRef(timers);
  const stepsRef = useRef(recipe?.steps ?? []);
  const showTimerPromptRef = useRef(showTimerPrompt);
  const pendingStepRef = useRef(pendingStep);
  useEffect(() => { stepRef.current = step; }, [step]);
  useEffect(() => { timersRef.current = timers; }, [timers]);
  useEffect(() => { stepsRef.current = recipe?.steps ?? []; }, [recipe]);
  useEffect(() => { showTimerPromptRef.current = showTimerPrompt; }, [showTimerPrompt]);
  useEffect(() => { pendingStepRef.current = pendingStep; }, [pendingStep]);

  const steps = recipe?.steps ?? [];
  const cur = steps[step];
  const total = steps.length;
  const curTimer = timers[step];

  // ── Wake lock ──────────────────────────────────────────────────────────
  useEffect(() => {
    let wl: any;
    if ("wakeLock" in navigator) navigator.wakeLock.request("screen").then(l => { wl = l; }).catch(() => {});
    return () => wl?.release();
  }, []);

  // ── Service worker registration ────────────────────────────────────────
  useEffect(() => { registerSW(); }, []);

  // ── Persist timers to localStorage on every change ─────────────────────
  useEffect(() => { saveTimers(timers); }, [timers]);

  // ── Clear persisted timers when cooking is finished ────────────────────
  useEffect(() => {
    return () => { try { localStorage.removeItem(TIMERS_KEY); } catch {} };
  }, []);

  // ── Voice promo — show once after nav hint clears ──────────────────────
  // New users: the nav hint is visible first; we wait for it to be dismissed.
  // Returning users who haven't seen the promo: show after 1.5 s on entry.
  useEffect(() => {
    if (!SR || localStorage.getItem("mise_voice_promo")) return; // no SR or already seen
    if (showHint) return;                                         // wait for nav hint
    const t = setTimeout(() => setVoicePromo(true), 1500);
    return () => clearTimeout(t);
  }, [showHint]);

  // Auto-dismiss the promo after 7 s; also mark seen immediately on tap (via dismiss fn)
  useEffect(() => {
    if (!voicePromo) return;
    const t = setTimeout(() => {
      setVoicePromo(false);
      localStorage.setItem("mise_voice_promo", "1");
    }, 7000);
    return () => clearTimeout(t);
  }, [voicePromo]);

  // ── Unlock audio ───────────────────────────────────────────────────────
  useEffect(() => {
    const unlock = () => {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf; src.connect(ctx.destination); src.start(0);
        setTimeout(() => ctx.close().catch(() => {}), 500);
      } catch {}
    };
    document.addEventListener("touchstart", unlock, { once: true });
    document.addEventListener("click", unlock, { once: true });
    return () => {
      document.removeEventListener("touchstart", unlock);
      document.removeEventListener("click", unlock);
    };
  }, []);

  // ── Timer tick — clock-based so accuracy survives backgrounding ────────
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTimers(prev => {
        const now = Date.now();
        const next = { ...prev };
        let changed = false;
        for (const [k, t] of Object.entries(next)) {
          const i = parseInt(k);
          if (!t.running || t.done) continue;
          const remaining = t.endsAt ? Math.max(0, Math.round((t.endsAt - now) / 1000)) : Math.max(0, t.remaining - 1);
          if (remaining !== t.remaining) {
            if (remaining === 0) {
              next[i] = { ...t, remaining: 0, running: false, done: true, completedAt: t.endsAt ?? now };
              playTimerDone();
            } else {
              next[i] = { ...t, remaining };
            }
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  // ── Keyboard nav ───────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goTo(stepRef.current + 1);
      if (e.key === "ArrowLeft") goTo(stepRef.current - 1);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // ── Mic amplitude → waveform bars ─────────────────────────────────────
  const startAudioAnalyser = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.6;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioCtxRef.current = ctx;
      analyserRef.current = analyser;

      const dataArr = new Uint8Array(analyser.frequencyBinCount);
      const BAR_BINS = [2, 4, 6, 9, 12]; // frequency bins mapped to each bar

      const tick = () => {
        analyser.getByteFrequencyData(dataArr);
        const levels = BAR_BINS.map(bin => {
          const raw = (dataArr[bin] ?? 0) / 255;
          return Math.max(0.08, Math.min(1, raw * 1.6)); // amplify a bit
        });
        setAudioLevels(levels);
        animFrameRef.current = requestAnimationFrame(tick);
      };
      animFrameRef.current = requestAnimationFrame(tick);
    } catch {
      // Mic access denied or not available — keep static bars
    }
  }, []);

  const stopAudioAnalyser = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioCtxRef.current) { audioCtxRef.current.close().catch(() => {}); audioCtxRef.current = null; }
    analyserRef.current = null;
    setAudioLevels([0.08, 0.08, 0.08, 0.08, 0.08]);
  }, []);

  // ── Timer helpers ──────────────────────────────────────────────────────
  const dismissTimer = useCallback((stepIdx: number) => {
    swCancel(stepIdx);
    setTimers(prev => { const next = { ...prev }; delete next[stepIdx]; return next; });
    setTimerModalIdx(null);
  }, []);

  const toggleTimerByRef = useCallback((stepIdx: number) => {
    const s = stepsRef.current[stepIdx];
    if (!s?.timerMinutes) return;
    hapticTimerStart();
    setTimers(prev => {
      const ex = prev[stepIdx];
      const now = Date.now();
      if (!ex || ex.done) {
        // Fresh start (or restart after done)
        const secs = s.timerMinutes! * 60;
        const endsAt = now + secs * 1000;
        Notification.requestPermission().catch(() => {});
        swSchedule(stepIdx, endsAt, s.instruction?.slice(0, 60) ?? "");
        return { ...prev, [stepIdx]: { remaining: secs, total: secs, running: true, done: false, completedAt: undefined, endsAt } };
      }
      if (ex.running) {
        // Pause — freeze remaining, clear endsAt
        swCancel(stepIdx);
        return { ...prev, [stepIdx]: { ...ex, running: false, endsAt: undefined } };
      } else {
        // Resume — recompute endsAt from current remaining
        const endsAt = now + ex.remaining * 1000;
        swSchedule(stepIdx, endsAt, s.instruction?.slice(0, 60) ?? "");
        return { ...prev, [stepIdx]: { ...ex, running: true, endsAt } };
      }
    });
  }, []);

  // ── Navigation ─────────────────────────────────────────────────────────
  const goTo = useCallback((next: number) => {
    setShowHint(false);
    if (next < 0) return;
    const cs = stepRef.current;
    const stepData = stepsRef.current[cs];
    const ct = timersRef.current[cs];
    if (next > cs && stepData?.timerMinutes && !ct) {
      setPendingStep(next); setShowTimerPrompt(true); return;
    }
    if (next >= (stepsRef.current.length)) { setShowFinish(true); return; }
    hapticStep();
    setStep(next);
    stepRef.current = next;
  }, []);

  // ── Timer-skip prompt actions (shared by buttons + voice) ──────────────
  const advanceToPending = useCallback(() => {
    setShowTimerPrompt(false);
    showTimerPromptRef.current = false;
    const ps = pendingStepRef.current;
    if (ps === null) return;
    setPendingStep(null);
    pendingStepRef.current = null;
    if (ps >= stepsRef.current.length) { setShowFinish(true); return; }
    hapticStep();
    setStep(ps);
    stepRef.current = ps;
  }, []);

  const confirmTimerPrompt = useCallback(() => {
    toggleTimerByRef(stepRef.current);   // start the current step's timer
    advanceToPending();
  }, [advanceToPending, toggleTimerByRef]);

  const skipTimerPrompt = useCallback(() => {
    advanceToPending();                   // move on without starting it
  }, [advanceToPending]);

  // Tap outside the sheet = cancel: close the prompt and STAY on the current
  // step (don't auto-advance to the pending step).
  const cancelTimerPrompt = useCallback(() => {
    setShowTimerPrompt(false);
    showTimerPromptRef.current = false;
    setPendingStep(null);
    pendingStepRef.current = null;
  }, []);

  // ── Voice command processing ───────────────────────────────────────────
  // Debounced — wait 400ms for speech to stabilise before acting.
  // Deduplicates — same command within 2s is ignored (prevents 6x "next").
  const processTranscript = useCallback((text: string, isFinal: boolean) => {
    const t = text.toLowerCase().trim();

    if (!isFinal) {
      // Show interim — but only trigger command if we're confident
      setVoiceTranscript(t);
      return;
    }

    // Deduplicate: same command within 2 seconds = ignore
    const now = Date.now();
    if (t === lastCommandRef.current && now - lastCommandTimeRef.current < 2000) {
      setVoiceTranscript(t);
      setVoiceStatus("heard");
      setTimeout(() => { setVoiceStatus("listening"); setVoiceTranscript(""); }, 1200);
      return;
    }
    lastCommandRef.current = t;
    lastCommandTimeRef.current = now;

    setVoiceTranscript(t);
    setVoiceStatus("heard");
    setTimeout(() => { setVoiceStatus("listening"); setVoiceTranscript(""); }, 1500);

    const cs = stepRef.current;
    // Extract step target for multi-timer voice commands ("pause step 2", "resume timer three")
    const targetStep = extractStepTarget(t) ?? cs;

    // ── Timer-skip prompt is open → voice controls ONLY that prompt ──────
    // Skip-intent is checked first so "no timer" / "skip" never trigger start.
    if (showTimerPromptRef.current) {
      const words = t.split(/\s+/);
      const has = (w: string) => words.includes(w);
      const skip = t.includes("skip") || has("no") || has("nope") || t.includes("without") || t.includes("don't") || t.includes("dont");
      const start = t.includes("start") || t.includes("timer") || t.includes("begin")
        || has("yes") || has("yeah") || has("yep") || has("ok") || has("okay")
        || t.includes("confirm") || t.includes("go ahead") || t.includes("do it") || t.includes("sure");
      if (skip) skipTimerPrompt();
      else if (start) confirmTimerPrompt();
      return;
    }

    // Commands — ordered by specificity to avoid false matches
    if (t.includes("start timer") || t.includes("timer start") || t.includes("set timer") || t.includes("count down") || t.includes("begin timer")) {
      toggleTimerByRef(cs);
    } else if (t.includes("resume") || t.includes("unpause") || (t.includes("play") && t.includes("timer"))) {
      // Resume a specific step's timer, or the current one
      setTimers(prev => {
        const tt = prev[targetStep];
        return tt && !tt.running && !tt.done ? { ...prev, [targetStep]: { ...tt, running: true } } : prev;
      });
    } else if (t.includes("pause") || t.includes("stop timer") || t.includes("hold on") || t.includes("wait")) {
      setTimers(prev => {
        const tt = prev[targetStep];
        return tt?.running ? { ...prev, [targetStep]: { ...tt, running: false } } : prev;
      });
    } else if (t.includes("next") || t.includes("continue") || t.includes("move on") || t.includes("forward") || t.includes("go on") || t.includes("proceed")) {
      goTo(cs + 1);
    } else if (t.includes("go back") || t.includes("previous") || t.includes("back") || t.includes("last step") || t.includes("before")) {
      goTo(cs - 1);
    } else if (t.includes("repeat") || t.includes("again") || t.includes("read") || t.includes("say that") || t.includes("what was")) {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(stepsRef.current[cs]?.instruction ?? "");
        u.rate = 0.88; window.speechSynthesis.speak(u);
      }
    } else if (t.includes("finish") || t.includes("all done") || t.includes("done cooking") || t.includes("complete") || t.includes("that's it")) {
      setShowFinish(true);
    }
  }, [goTo, toggleTimerByRef, confirmTimerPrompt, skipTimerPrompt]);

  // ── Voice recognition — single-shot, auto-restart ─────────────────────
  const voiceActiveRef = useRef(false);

  const startSingleShot = useCallback(() => {
    if (!SR || !voiceActiveRef.current) return;
    if (recRef.current) { try { recRef.current.abort(); } catch {} recRef.current = null; }

    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.maxAlternatives = 1;

    rec.onstart = () => { setVoiceStatus("listening"); };

    rec.onresult = (e: any) => {
      if (e.results.length === 0) return;
      const result = e.results[0];
      const transcript = result[0].transcript;
      const isFinal = result.isFinal;

      // Clear debounce
      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (isFinal) {
        processTranscript(transcript, true);
      } else {
        // Show interim in real-time, debounce command processing
        setVoiceTranscript(transcript);
        setVoiceStatus("listening");
        debounceRef.current = setTimeout(() => {
          if (transcript.length > 2) processTranscript(transcript, true);
        }, 600);
      }
    };

    rec.onerror = (e: any) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setVoiceActive(false); voiceActiveRef.current = false;
        setVoiceStatus("idle"); setVoiceTranscript("Mic access denied");
        setTimeout(() => setVoiceTranscript(""), 2500);
        return;
      }
      // Other errors (no-speech, aborted) — just restart
    };

    rec.onend = () => {
      recRef.current = null;
      // Auto-restart after short delay if still active
      if (voiceActiveRef.current) {
        setTimeout(() => startSingleShot(), 150);
      }
    };

    recRef.current = rec;
    try { rec.start(); } catch { setTimeout(() => startSingleShot(), 300); }
  }, [processTranscript]);

  const stopVoice = useCallback(() => {
    voiceActiveRef.current = false;
    if (recRef.current) { try { recRef.current.abort(); } catch {} recRef.current = null; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    stopAudioAnalyser();
    setVoiceActive(false);
    setVoiceStatus("idle");
    setVoiceTranscript("");
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, [stopAudioAnalyser]);

  const dismissVoicePromo = useCallback(() => {
    setVoicePromo(false);
    localStorage.setItem("mise_voice_promo", "1");
  }, []);

  const toggleVoice = useCallback(async () => {
    dismissVoicePromo(); // tapping mic counts as "seen"
    if (voiceActive) {
      stopVoice();
    } else {
      if (!SR) {
        // Show a dismissible message explaining the limitation
        setVoiceTranscript(VOICE_UNAVAILABLE_MSG);
        setVoiceStatus("heard");
        setTimeout(() => { setVoiceTranscript(""); setVoiceStatus("idle"); }, 4000);
        return;
      }
      // Explicitly ask for the mic up front. SpeechRecognition can otherwise
      // fail silently when permission hasn't been granted — the button just
      // does nothing. Prompting here makes voice reliably turn on, and lets us
      // show a clear message when the browser has blocked the mic.
      try {
        const probe = await navigator.mediaDevices.getUserMedia({ audio: true });
        probe.getTracks().forEach(t => t.stop());
      } catch {
        voiceActiveRef.current = false;
        setVoiceActive(false);
        setVoiceStatus("heard");
        setVoiceTranscript("Mic access is blocked. Allow the microphone for this site in your browser, then tap the mic again.");
        setTimeout(() => { setVoiceTranscript(""); setVoiceStatus("idle"); }, 5000);
        return;
      }
      voiceActiveRef.current = true;
      setVoiceActive(true);
      setVoiceStatus("listening");
      startSingleShot();
      startAudioAnalyser();
      if (!localStorage.getItem("mise_voice_hint")) {
        setVoiceHint(true);
        localStorage.setItem("mise_voice_hint", "1");
      }
    }
  }, [voiceActive, stopVoice, startSingleShot, startAudioAnalyser]);

  useEffect(() => () => stopVoice(), [stopVoice]);

  const finish = () => {
    stopVoice();
    if (recipe) addHistory({ name: recipe.name, cuisine: recipe.cuisine, rating: "good", ts: Date.now() });
    navigate({ to: "/feedback" });
  };

  if (!recipe) {
    return (
      <MobileFrame>
        <div className="flex-1 flex items-center justify-center px-6">
          <p className="text-text-secondary text-center">No recipe loaded.</p>
        </div>
      </MobileFrame>
    );
  }

  // Step heading: first clause of instruction, with quantities stripped.
  // "Heat 2 tbsp olive oil in a medium frying pan…" → "Heat olive oil in a…"
  // "Rinse 185g rice. Cook with 250ml water…"      → "Rinse rice…"
  const stepTitle = (() => {
    if (!cur?.instruction) return "";

    // 1. Take only the first clause (before ". ", " — ", " – ", "; ")
    const clause = cur.instruction.split(/\.\s+|\s*[—–]\s+|;\s*/)[0].trim();

    // 2. Strip all quantity patterns so measurement words don't appear in the title.
    //    Handles: "2 tbsp", "500 ml", "185g", "½ tsp", "1¼ cups", "3-minute", etc.
    const clean = clause
      .replace(/\b\d+(?:[.,]\d+)?(?:\s*(?:g|kg|ml|l|litres?|tbsp?s?|tsps?|cups?|cloves?|mins?|minutes?|seconds?|hrs?|hours?|cm|mm|°[CF]))?\b/gi, "")
      .replace(/[¼½¾⅓⅔⅛]\s*(?:tbsp?|tsp|cups?)?\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    // 3. Truncate to ~22 chars at a word boundary
    let title = clean;
    if (title.length > 22) {
      const cut = title.slice(0, 22);
      const lastSp = cut.lastIndexOf(" ");
      title = lastSp > 5 ? cut.slice(0, lastSp) : cut;
    }

    // 4. Strip dangling articles/prepositions at end ("…in a", "…and the")
    title = title.replace(/\s+\b(the|a|an|and|or|in|on|of|to|with|for|at|as)\b\s*$/i, "").trim();
    // 5. Strip trailing punctuation
    title = title.replace(/[,;:]+$/, "").trim();

    return title.length >= 3 ? title + "…" : "";
  })();

  return (
    <MobileFrame>
      <div className="flex flex-col h-full relative overflow-hidden">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 pt-5 pb-2">
          {/* Step 0: back = return to prep page. Step 1+: back = previous step. */}
          <button
            onClick={() => step === 0 ? setPrepDone(false) : goTo(step - 1)}
            className="text-[12px] text-text-secondary font-mono active:opacity-70 h-10 px-2 flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> {step === 0 ? "Prep" : "Back"}
          </button>
          <span className="font-mono text-[10px] text-text-tertiary uppercase tracking-widest text-center truncate max-w-[140px]">
            {recipe.name}
          </span>
          <div className="flex items-center gap-2">
            {/* Mic button — pulsing ring draws attention while voice promo is showing */}
            <div className="relative">
              {voicePromo && !voiceActive && (
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-ember"
                  animate={{ scale: [1, 1.65], opacity: [0.7, 0] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
                />
              )}
              <button
                onClick={toggleVoice}
                title={!SR ? VOICE_UNAVAILABLE_MSG : undefined}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                  voiceActive
                    ? "bg-ember text-bg-base shadow-[0_0_14px_oklch(0.520_0.178_35_/_0.55)]"
                    : voicePromo
                      ? "bg-ember/20 border-2 border-ember text-ember-text"
                      : "bg-bg-raised border border-border-default text-text-secondary"
                } ${!SR ? "opacity-40 cursor-not-allowed active:scale-100" : ""}`}
              >
                {voiceActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </button>
            </div>
            <button onClick={() => setShowExitConfirm(true)}
              className="w-9 h-9 bg-bg-raised rounded-full border border-border-default flex items-center justify-center text-text-primary active:scale-90">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Voice discovery promo — shows once on first cook ─────────── */}
        <AnimatePresence>
          {voicePromo && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="flex-shrink-0 overflow-hidden"
            >
              <button
                onClick={dismissVoicePromo}
                className="w-full flex items-center gap-3 px-4 py-3 bg-ember/10 border-b border-ember-dim/50 text-left active:bg-ember/15 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-ember/20 border border-ember-dim flex items-center justify-center flex-shrink-0">
                  <Mic className="w-3.5 h-3.5 text-ember-text" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-ember-text leading-tight">
                    Cook hands-free with voice
                  </p>
                  <p className="text-[11px] text-text-secondary leading-tight mt-0.5">
                    Tap the mic — say "next", "start timer", "done"
                  </p>
                </div>
                <X className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Voice status bar ────────────────────────────────────────── */}
        <AnimatePresence>
          {(voiceActive || voiceTranscript) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-shrink-0 px-4 pb-2 overflow-hidden"
            >
              <div className={`rounded-xl px-4 py-2.5 flex items-center gap-3 transition-colors ${
                voiceStatus === "heard"
                  ? "bg-ember-glow border border-ember-dim"
                  : "bg-bg-raised border border-border-subtle"
              }`}>
                {/* Live mic waveform while listening; a mic-off cue for messages */}
                {voiceActive
                  ? <VoiceWaveform levels={audioLevels} />
                  : <MicOff className="w-4 h-4 text-ember-text flex-shrink-0" />
                }

                <span className={`text-[13px] flex-1 font-mono leading-snug break-words ${
                  voiceActive ? "truncate" : ""
                } ${
                  voiceStatus === "heard" ? "text-ember-text" : "text-text-secondary"
                }`}>
                  {voiceTranscript
                    ? (voiceActive ? `"${voiceTranscript}"` : voiceTranscript)
                    : "Listening…"
                  }
                </span>

                {voiceStatus === "heard" && (
                  <motion.span
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="text-[11px] text-ember-text font-semibold flex-shrink-0"
                  >✓</motion.span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Progress segments ────────────────────────────────────────── */}
        <div className="flex-shrink-0 flex gap-1 px-4 py-2">
          {steps.map((_, i) => (
            <div key={i} className={`flex-1 h-[3px] rounded-full transition-colors
              ${i < step ? "bg-ember" : i === step ? "bg-ember/60" : "bg-bg-overlay"}`} />
          ))}
        </div>

        {/* ── Step content ─────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          <motion.div key={step}
            initial={{ opacity: 0, x: 32 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -32 }}
            transition={{ type: "spring", stiffness: 360, damping: 30 }}
            className="flex-1 min-h-0 flex flex-col px-6 pt-2 overflow-y-auto overscroll-contain pb-4"
          >
            <div className="relative mb-5">
              <span className="absolute right-0 top-0 font-display text-[96px] font-light text-bg-surface leading-none select-none pointer-events-none">
                {String(step + 1).padStart(2, "0")}
              </span>
              <p className="label-eyebrow mb-1 relative z-10">STEP {step + 1} OF {total}</p>
              <p className="font-display text-[16px] font-light text-ember-text mb-2 relative z-10">{stepTitle}</p>
              <p className="font-sans text-[20px] font-semibold text-text-primary leading-snug relative z-10">
                {cur?.instruction}
              </p>
            </div>

            {/* Current step timer — with progress fill */}
            {cur?.timerMinutes && (() => {
              const progress = curTimer && curTimer.total > 0
                ? (curTimer.total - curTimer.remaining) / curTimer.total : 0;
              return (
                <div className={`relative rounded-xl p-4 flex items-center justify-between border mb-4 overflow-hidden transition-all ${
                  curTimer?.done ? "bg-success/10 border-success"
                  : curTimer?.running ? "bg-bg-raised border-ember-dim"
                  : "bg-bg-raised border-border-default"
                }`}>
                  {curTimer && !curTimer.done && (
                    <div
                      className="absolute left-0 top-0 bottom-0 bg-ember/10 pointer-events-none"
                      style={{ width: `${progress * 100}%`, transition: "width 0.9s linear" }}
                    />
                  )}
                  <div className="relative z-10">
                    <p className="label-eyebrow mb-1">
                      {curTimer?.done ? "✓ Timer finished" : curTimer?.running ? "Running" : `${cur.timerMinutes} min timer`}
                    </p>
                    <p className={`font-mono text-[36px] leading-none font-medium ${
                      curTimer?.done ? "text-success" : "text-ember"
                    }`}>
                      {curTimer?.done
                        ? (curTimer.completedAt ? fmtElapsed(curTimer.completedAt) : "Done!")
                        : curTimer ? fmt(curTimer.remaining) : fmt(cur.timerMinutes * 60)}
                    </p>
                  </div>
                  {curTimer?.done ? (
                    <button onClick={() => toggleTimerByRef(step)}
                      className="relative z-10 h-11 px-5 rounded-xl border border-border-default bg-bg-raised text-text-secondary text-[13px] font-medium active:scale-95 transition flex items-center gap-2">
                      <RotateCcw className="w-3.5 h-3.5" />Start again
                    </button>
                  ) : (
                    <button onClick={() => toggleTimerByRef(step)}
                      className="relative z-10 h-11 px-5 rounded-xl btn-ember text-[14px] font-semibold active:scale-95 transition flex items-center gap-2">
                      {curTimer?.running
                        ? <><Pause className="w-4 h-4" />Pause</>
                        : <><Play className="w-4 h-4" />{curTimer ? "Resume" : "Start"}</>}
                    </button>
                  )}
                </div>
              );
            })()}

            {cur?.notes && (
              <p className="text-[13px] text-text-secondary italic leading-relaxed">{cur.notes}</p>
            )}
          </motion.div>
        </AnimatePresence>

        {/* ── Floating timer row — ABOVE nav buttons, left-to-right scroll */}
        <AnimatePresence>
          {Object.entries(timers).some(([k, t]) => parseInt(k) !== step && (t.running || t.done)) && (
            <FloatingTimerRow
              timers={timers}
              steps={steps}
              currentStep={step}
              onOpenModal={(idx) => setTimerModalIdx(idx)}
            />
          )}
        </AnimatePresence>

        {/* ── Sticky nav buttons ────────────────────────────────────────── */}
        <KeyboardAwareFooter className="flex gap-3">
          <button onClick={() => goTo(step - 1)} disabled={step === 0}
            className="flex-1 h-12 rounded-xl bg-bg-surface border border-border-default text-text-secondary flex items-center justify-center gap-2 text-[14px] active:scale-95 transition disabled:opacity-30 disabled:active:scale-100">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <button onClick={() => goTo(step + 1)}
            className="flex-1 h-12 rounded-xl btn-ember flex items-center justify-center gap-2 text-[14px] font-semibold active:scale-95 transition">
            {step === total - 1 ? "Finish" : "Next"} <ArrowRight className="w-4 h-4" />
          </button>
        </KeyboardAwareFooter>

        {/* ── Timer detail modal (bottom sheet, no navigation) ─────────── */}
        <AnimatePresence>
          {timerModalIdx !== null && (
            <TimerModal
              timerIdx={timerModalIdx}
              timers={timers}
              steps={steps}
              onClose={() => setTimerModalIdx(null)}
              onToggle={(idx) => toggleTimerByRef(idx)}
              onDismiss={dismissTimer}
            />
          )}
        </AnimatePresence>

        {/* ── Voice hint overlay ────────────────────────────────────────── */}
        <AnimatePresence>
          {voiceHint && <VoiceHintOverlay onDismiss={() => setVoiceHint(false)} />}
        </AnimatePresence>

        {/* ── Nav hint ─────────────────────────────────────────────────── */}
        <AnimatePresence>
          {showHint && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-bg-base/90 backdrop-blur-sm flex flex-col items-center justify-center gap-6 px-8 z-50"
              onClick={() => { setShowHint(false); localStorage.setItem("mise_hint_v4", "1"); }}>
              <div className="flex items-center gap-10">
                {[
                  { Icon: ArrowLeft,  bg: "bg-bg-surface border border-border-default", tc: "text-text-secondary", label: "Previous" },
                  { Icon: ArrowRight, bg: "bg-ember",                                   tc: "text-bg-base",       label: "Next step" },
                ].map(({ Icon, bg, tc, label }, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 320, damping: 26, delay: 0.08 + i * 0.1 }}
                    className="flex flex-col items-center gap-2">
                    <div className={`w-14 h-14 rounded-full ${bg} border flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${tc}`} />
                    </div>
                    <span className={`text-[12px] ${i === 1 ? "text-ember-text" : "text-text-secondary"}`}>{label}</span>
                  </motion.div>
                ))}
              </div>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.28 }}
                className="text-[14px] text-text-secondary text-center">
                Navigate using the buttons below
              </motion.p>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                className="text-[12px] text-text-tertiary text-center">
                Tap 🎙 for voice control · tap to dismiss
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Timer prompt ─────────────────────────────────────────────── */}
        <AnimatePresence>
          {showTimerPrompt && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm flex items-end z-50"
              onClick={cancelTimerPrompt}>
              <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
                transition={{ type: "spring", stiffness: 360, damping: 30 }}
                className="w-full bg-bg-surface rounded-t-3xl p-8 pb-safe-lg"
                onClick={e => e.stopPropagation()}>
                <div className="w-12 h-1 bg-border-default rounded-full mx-auto mb-6" />
                <div className="text-center mb-6">
                  <motion.span animate={{ rotate: [0, -10, 10, -5, 5, 0] }} transition={{ duration: 0.6, delay: 0.1 }}
                    className="text-4xl block">⏱</motion.span>
                  <h3 className="font-display text-[22px] font-light text-text-primary mt-3">
                    {cur?.timerMinutes}-minute timer for this step
                  </h3>
                  <p className="text-[13px] text-text-secondary mt-2">
                    Start it. It keeps running while you move on.
                  </p>
                  {voiceActive && (
                    <p className="text-[12px] text-ember-text mt-2 flex items-center justify-center gap-1.5">
                      <Mic className="w-3 h-3" /> Say "start" or "skip"
                    </p>
                  )}
                </div>
                <div className="space-y-3">
                  <button onClick={confirmTimerPrompt}
                    className="w-full h-14 rounded-xl btn-ember text-[15px] font-semibold active:scale-[0.98] transition">
                    Start timer
                  </button>
                  <button onClick={skipTimerPrompt}
                    className="w-full h-14 rounded-xl bg-bg-raised border border-border-default text-text-primary text-[14px] active:scale-[0.98] transition">
                    Skip
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Finish dialog ────────────────────────────────────────────── */}
        <AnimatePresence>
          {showFinish && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm flex items-end z-50"
              onClick={() => setShowFinish(false)}>
              <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
                transition={{ type: "spring", stiffness: 360, damping: 30 }}
                className="w-full bg-bg-surface rounded-t-3xl p-8 pb-safe-lg"
                onClick={e => e.stopPropagation()}>
                <div className="w-12 h-1 bg-border-default rounded-full mx-auto mb-8" />
                <h2 className="font-display text-[28px] font-light text-text-primary text-center">All done?</h2>
                <p className="text-[14px] text-text-secondary text-center mt-3">Confirm if you've finished cooking.</p>
                <div className="mt-8 space-y-3">
                  <button onClick={() => { setShowFinish(false); setShowAchieve(true); }}
                    className="w-full h-14 rounded-xl btn-ember text-[15px] font-semibold active:scale-[0.98] transition">
                    I'm done
                  </button>
                  <button onClick={() => setShowFinish(false)}
                    className="w-full h-14 rounded-xl bg-bg-raised border border-border-default text-text-primary text-[14px] active:scale-[0.98] transition">
                    Go back
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Exit confirmation ─────────────────────────────────────────── */}
        <AnimatePresence>
          {showExitConfirm && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm flex items-end z-50">
              <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
                transition={{ type: "spring", stiffness: 360, damping: 30 }}
                className="w-full bg-bg-surface rounded-t-3xl p-8 pb-safe-lg">
                <div className="w-12 h-1 bg-border-default rounded-full mx-auto mb-6" />
                <div className="text-center mb-6">
                  <span className="text-3xl block mb-3">🍳</span>
                  <h3 className="font-display text-[22px] font-light text-text-primary">Exit cook mode?</h3>
                  <p className="text-[13px] text-text-secondary mt-2 leading-relaxed">
                    You're on step {step + 1} of {total}. Timer progress will be lost.
                  </p>
                </div>
                <div className="space-y-3">
                  <button onClick={() => setShowExitConfirm(false)}
                    className="w-full h-14 rounded-xl btn-ember text-[15px] font-semibold active:scale-[0.98] transition">
                    Keep cooking
                  </button>
                  <button onClick={() => { stopVoice(); navigate({ to: "/" }); }}
                    className="w-full h-14 rounded-xl bg-bg-raised border border-border-default text-text-primary text-[14px] active:scale-[0.98] transition">
                    Exit anyway
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Achievement ──────────────────────────────────────────────── */}
        <AnimatePresence>
          {showAchieve && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="absolute inset-0 bg-bg-base flex flex-col items-center justify-center px-8 z-50">
              <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", damping: 12, delay: 0.1 }} className="text-[80px] mb-6">🍽️</motion.div>
              <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="font-display text-[32px] font-light text-text-primary text-center leading-tight">
                You cooked something <span className="text-ember italic">different.</span>
              </motion.h2>
              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                className="text-[15px] text-text-secondary text-center mt-4 leading-relaxed max-w-xs">
                That took courage. Most people would have made pasta again.
              </motion.p>
              <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.7, duration: 0.5 }}
                className="w-16 h-[2px] bg-ember rounded-full my-8" />
              <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}
                onClick={finish}
                className="w-full h-14 rounded-xl btn-ember text-[15px] font-semibold active:scale-[0.98] transition">
                How did it go? →
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Prep screen — shown on first entry, dismissed once ────────── */}
        <AnimatePresence>
          {!prepDone && (
            <PrepScreen
              recipe={recipe}
              onStart={() => setPrepDone(true)}
              onBack={() => navigate({ to: "/recipe" })}
            />
          )}
        </AnimatePresence>

      </div>
    </MobileFrame>
  );
}
