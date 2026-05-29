import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, ArrowRight, X, Play, Pause, Mic, MicOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MobileFrame } from "@/components/mise/MobileFrame";
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

type TimerState = { remaining: number; total: number; running: boolean; done: boolean };

// ── Prep helpers ───────────────────────────────────────────────────────────
const PREP_KW = ["chopped","diced","sliced","minced","grated","peeled","shredded",
  "julienned","crushed","ground","blended","soaked","marinated","thawed","drained",
  "rinsed","washed","trimmed","halved","quartered","beaten","whisked","deveined"];
const needsPrep = (name: string) => PREP_KW.some(k => name.toLowerCase().includes(k));

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
function PrepScreen({ recipe, onStart }: { recipe: any; onStart: () => void }) {
  const ings: any[] = recipe.ingredients ?? [];
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const prepItems = ings.filter(i => needsPrep(i.name));
  const grabItems = ings.filter(i => !needsPrep(i.name));
  const toggle = (i: number) =>
    setChecked(p => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n; });
  const allDone = prepItems.length > 0 && prepItems.every((_, i) => checked.has(i));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 340, damping: 30 }}
      className="absolute inset-0 bg-bg-base z-50 flex flex-col"
    >
      <div className="flex-shrink-0 px-5 pt-14 pb-4">
        <p className="label-eyebrow mb-1">Before you start</p>
        <h2 className="font-display text-[26px] font-light text-text-primary">Mise en place</h2>
        <p className="text-[13px] text-text-secondary mt-1.5 leading-relaxed">
          Prep these now — interruptions mid-cook are the enemy.
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 space-y-5 pb-4">
        {prepItems.length > 0 && (
          <div>
            <p className="label-eyebrow mb-2.5">Needs prep</p>
            <div className="space-y-2">
              {prepItems.map((ing, i) => {
                const done = checked.has(i);
                return (
                  <motion.button key={i} onClick={() => toggle(i)} layout
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors active:scale-[0.99]
                      ${done ? "bg-success/10 border-success/30" : "bg-bg-surface border-border-subtle"}`}
                  >
                    <motion.div animate={done ? { scale: [1, 1.25, 1] } : {}}
                      className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors
                        ${done ? "bg-success border-success" : "border-border-default"}`}
                    >
                      {done && <span className="text-bg-base text-[9px] font-bold leading-none">✓</span>}
                    </motion.div>
                    <p className={`flex-1 text-left text-[13px] font-medium transition-colors
                      ${done ? "line-through text-success/70" : "text-text-primary"}`}>
                      {ing.name}
                    </p>
                    <span className="text-[11px] text-text-tertiary font-mono flex-shrink-0">{ing.quantity}</span>
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
                <div key={i} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-[13px] text-text-secondary">{ing.name}</span>
                  <span className="text-[11px] text-text-tertiary font-mono">{ing.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {ings.length === 0 && (
          <p className="text-center text-[13px] text-text-tertiary py-10">No ingredients listed.</p>
        )}
      </div>

      <div className="flex-shrink-0 px-4 pb-safe pt-3 bg-bg-base border-t border-border-subtle">
        {prepItems.length > 0 && !allDone && (
          <p className="text-[11px] text-text-tertiary text-center mb-2.5">
            {prepItems.length - checked.size} item{prepItems.length - checked.size !== 1 ? "s" : ""} unchecked — you can still start
          </p>
        )}
        <button onClick={onStart}
          className="w-full h-14 rounded-xl btn-ember text-[15px] font-semibold active:scale-[0.98] transition">
          {allDone ? "All prepped — let's cook →" : prepItems.length === 0 ? "Let's cook →" : "Start cooking →"}
        </button>
      </div>
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
        className="w-16 h-16 rounded-full bg-ember flex items-center justify-center mb-5 shadow-[0_0_24px_rgba(232,117,26,0.5)]"
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
    .filter(([k, t]) => parseInt(k) !== currentStep && (t.running || t.done))
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
                {t.done ? "Done!" : fmt(t.remaining)}
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

      {/* Fade hint if scrollable */}
      {active.length > 3 && (
        <p className="text-[10px] text-text-tertiary text-right mt-0.5 font-mono">
          scroll →
        </p>
      )}
    </motion.div>
  );
}

// ── Timer Detail Modal ─────────────────────────────────────────────────────
// Bottom sheet showing one timer's details. No navigation.
function TimerModal({
  timerIdx, timers, steps, onClose, onToggle,
}: {
  timerIdx: number | null; timers: Record<number, TimerState>;
  steps: any[]; onClose: () => void;
  onToggle: (idx: number) => void;
}) {
  if (timerIdx === null) return null;
  const t = timers[timerIdx];
  if (!t) return null;
  const s = steps[timerIdx];
  const urgent = t.remaining < 30 && t.running && !t.done;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 bg-black/60 z-40 flex items-end"
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
                  {t.done ? "✓ Finished" : t.running ? "Running" : "Paused"}
                </p>
                <p className={`font-mono text-[48px] leading-none font-medium ${
                  t.done ? "text-success" : urgent ? "text-warning" : "text-ember"
                }`}>
                  {t.done ? "Done!" : fmt(t.remaining)}
                </p>
              </div>
              {!t.done && (
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
  const [timers, setTimers] = useState<Record<number, TimerState>>({});
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
  useEffect(() => { stepRef.current = step; }, [step]);
  useEffect(() => { timersRef.current = timers; }, [timers]);
  useEffect(() => { stepsRef.current = recipe?.steps ?? []; }, [recipe]);

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

  // ── Timer tick ─────────────────────────────────────────────────────────
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTimers(prev => {
        const next = { ...prev };
        let changed = false;
        for (const [k, t] of Object.entries(next)) {
          const i = parseInt(k);
          if (t.running && t.remaining > 0) { next[i] = { ...t, remaining: t.remaining - 1 }; changed = true; }
          else if (t.running && t.remaining === 0) { next[i] = { ...t, running: false, done: true }; playTimerDone(); changed = true; }
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
  const toggleTimerByRef = useCallback((stepIdx: number) => {
    const s = stepsRef.current[stepIdx];
    if (!s?.timerMinutes) return;
    hapticTimerStart();
    setTimers(prev => {
      const ex = prev[stepIdx];
      if (!ex) {
        const secs = s.timerMinutes! * 60;
        return { ...prev, [stepIdx]: { remaining: secs, total: secs, running: true, done: false } };
      }
      return { ...prev, [stepIdx]: { ...ex, running: !ex.running } };
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
  }, [goTo, toggleTimerByRef]);

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

  const toggleVoice = useCallback(() => {
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

  // Smart heading: extract verb + meaningful noun, skip filler words
  const stepTitle = (() => {
    if (!cur?.instruction) return "";
    const FILLERS = new Set([
      "the","a","an","and","or","in","on","of","to","with","until","until","your",
      "1","2","3","4","5","6","7","8","all","both","some","each","any",
      "completely","gently","carefully","quickly","lightly","well","thoroughly",
      "large","small","medium","heavy","wide","hot","cold","fresh","dry","wet",
    ]);
    const words = cur.instruction.split(" ");
    const kept: string[] = [];
    for (const w of words) {
      const clean = w.replace(/[^a-zA-Z]/g, "").toLowerCase();
      if (!FILLERS.has(clean) && clean.length > 1) {
        kept.push(w.replace(/[,.:;!?]/g, ""));
        if (kept.length === 3) break;
      }
    }
    return kept.join(" ") + "…";
  })();

  return (
    <MobileFrame>
      <div className="flex flex-col h-full relative overflow-hidden">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 pt-12 pb-2">
          <button onClick={() => navigate({ to: "/recipe" })}
            className="text-[12px] text-text-secondary font-mono active:opacity-70 h-10 px-2 flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <span className="font-mono text-[10px] text-text-tertiary uppercase tracking-widest text-center truncate max-w-[140px]">
            {recipe.name}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleVoice}
              title={!SR ? VOICE_UNAVAILABLE_MSG : undefined}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                voiceActive
                  ? "bg-ember text-bg-base shadow-[0_0_14px_rgba(232,117,26,0.6)]"
                  : "bg-bg-raised border border-border-default text-text-secondary"
              } ${!SR ? "opacity-40 cursor-not-allowed active:scale-100" : ""}`}
            >
              {voiceActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>
            <button onClick={() => setShowExitConfirm(true)}
              className="w-9 h-9 bg-bg-raised rounded-full border border-border-default flex items-center justify-center text-text-primary active:scale-90">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Voice status bar ────────────────────────────────────────── */}
        <AnimatePresence>
          {voiceActive && (
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
                {/* Real mic amplitude waveform */}
                <VoiceWaveform levels={audioLevels} />

                <span className={`text-[13px] flex-1 font-mono truncate ${
                  voiceStatus === "heard" ? "text-ember-text" : "text-text-secondary"
                }`}>
                  {voiceTranscript
                    ? `"${voiceTranscript}"`
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
            className="flex-1 min-h-0 flex flex-col px-6 pt-2 overflow-y-auto pb-4"
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
                      {curTimer?.done ? "✓ Done" : curTimer?.running ? "Running" : `${cur.timerMinutes} min timer`}
                    </p>
                    <p className={`font-mono text-[36px] leading-none font-medium ${
                      curTimer?.done ? "text-success" : "text-ember"
                    }`}>
                      {curTimer ? fmt(curTimer.remaining) : fmt(cur.timerMinutes * 60)}
                    </p>
                  </div>
                  {!curTimer?.done && (
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
        <div className="flex-shrink-0 flex gap-3 px-4 pb-safe pt-3 border-t border-border-subtle bg-bg-base">
          <button onClick={() => goTo(step - 1)} disabled={step === 0}
            className="flex-1 h-12 rounded-xl bg-bg-surface border border-border-default text-text-secondary flex items-center justify-center gap-2 text-[14px] active:scale-95 transition disabled:opacity-30 disabled:active:scale-100">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <button onClick={() => goTo(step + 1)}
            className="flex-1 h-12 rounded-xl btn-ember flex items-center justify-center gap-2 text-[14px] font-semibold active:scale-95 transition">
            {step === total - 1 ? "Finish" : "Next"} <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* ── Timer detail modal (bottom sheet, no navigation) ─────────── */}
        <AnimatePresence>
          {timerModalIdx !== null && (
            <TimerModal
              timerIdx={timerModalIdx}
              timers={timers}
              steps={steps}
              onClose={() => setTimerModalIdx(null)}
              onToggle={(idx) => toggleTimerByRef(idx)}
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
                  { Icon: ArrowLeft,  bg: "bg-bg-surface border-border-default", tc: "text-text-secondary", label: "Previous" },
                  { Icon: ArrowRight, bg: "bg-ember",                             tc: "text-bg-base",       label: "Next step" },
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
              className="absolute inset-0 bg-black/75 flex items-end z-50">
              <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
                transition={{ type: "spring", stiffness: 360, damping: 30 }}
                className="w-full bg-bg-surface rounded-t-3xl p-8 pb-safe-lg">
                <div className="w-12 h-1 bg-border-default rounded-full mx-auto mb-6" />
                <div className="text-center mb-6">
                  <motion.span animate={{ rotate: [0, -10, 10, -5, 5, 0] }} transition={{ duration: 0.6, delay: 0.1 }}
                    className="text-4xl block">⏱</motion.span>
                  <h3 className="font-display text-[22px] font-light text-text-primary mt-3">
                    {cur?.timerMinutes}-minute timer for this step
                  </h3>
                  <p className="text-[13px] text-text-secondary mt-2">
                    Start it — it keeps running while you move on.
                  </p>
                </div>
                <div className="space-y-3">
                  <button onClick={() => {
                    toggleTimerByRef(step);
                    setShowTimerPrompt(false);
                    if (pendingStep !== null) {
                      const ps = pendingStep;
                      setPendingStep(null);
                      if (ps >= total) setShowFinish(true);
                      else { hapticStep(); setStep(ps); stepRef.current = ps; }
                    }
                  }} className="w-full h-14 rounded-xl btn-ember text-[15px] font-semibold active:scale-[0.98] transition">
                    Start timer and continue
                  </button>
                  <button onClick={() => {
                    setShowTimerPrompt(false);
                    if (pendingStep !== null) {
                      const ps = pendingStep;
                      setPendingStep(null);
                      if (ps >= total) setShowFinish(true);
                      else { hapticStep(); setStep(ps); stepRef.current = ps; }
                    }
                  }} className="w-full h-14 rounded-xl bg-bg-raised border border-border-default text-text-primary text-[14px] active:scale-[0.98] transition">
                    Skip — move on
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
              className="absolute inset-0 bg-black/75 flex items-end z-50">
              <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
                transition={{ type: "spring", stiffness: 360, damping: 30 }}
                className="w-full bg-bg-surface rounded-t-3xl p-8 pb-safe-lg">
                <div className="w-12 h-1 bg-border-default rounded-full mx-auto mb-8" />
                <h2 className="font-display text-[28px] font-light text-text-primary text-center">All done?</h2>
                <p className="text-[14px] text-text-secondary text-center mt-3">Confirm if you've finished cooking.</p>
                <div className="mt-8 space-y-3">
                  <button onClick={() => { setShowFinish(false); setShowAchieve(true); }}
                    className="w-full h-14 rounded-xl btn-ember text-[15px] font-semibold active:scale-[0.98] transition">
                    Yes, I'm done ✓
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
              className="absolute inset-0 bg-black/75 flex items-end z-50">
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
                    className="w-full h-14 rounded-xl bg-bg-raised border border-border-default text-text-secondary text-[14px] active:scale-[0.98] transition">
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
            <PrepScreen recipe={recipe} onStart={() => setPrepDone(true)} />
          )}
        </AnimatePresence>

      </div>
    </MobileFrame>
  );
}
