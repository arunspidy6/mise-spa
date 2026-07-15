import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Clock } from "lucide-react";
import { MobileFrame } from "@/components/mise/MobileFrame";
import { EmberButton } from "@/components/mise/EmberButton";
import { setOnboarded } from "@/lib/onboarding";
import { track } from "@/lib/analytics";

export const Route = createFileRoute("/onboarding")({ component: Onboarding });

// ── Animated "product demo" visuals ─────────────────────────────────────────
// Each slide's hero is a small looping motion sequence (the SaaS onboarding
// pattern) rather than a heavy video file: crisp, on-brand, offline, no asset.

// Slide 1 — ingredient chips fill in sequence, like tapping your kitchen.
const KITCHEN_CHIPS = ["🥚 Eggs", "🧅 Onion", "🧄 Garlic", "🍅 Tomatoes", "🧀 Cheese", "🌶️ Chilli", "🍝 Pasta", "🥬 Spinach"];
function KitchenVisual() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setN(x => (x >= KITCHEN_CHIPS.length ? 0 : x + 1)), 620);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="w-full rounded-2xl bg-bg-surface border border-border-default p-5">
      <p className="label-eyebrow mb-3">Your kitchen</p>
      <div className="flex flex-wrap gap-2">
        {KITCHEN_CHIPS.map((c, i) => {
          const active = i < n;
          return (
            <div
              key={c}
              className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-full border text-[13px] font-medium transition-all duration-300 ${
                active
                  ? "bg-ember-chip border-ember-chip text-[oklch(0.965_0.018_72)]"
                  : "bg-bg-elevated border-border-default text-text-secondary"
              }`}
              style={active ? { boxShadow: "0 2px 8px oklch(0 0 0 / 0.28)" } : undefined}
            >
              {c}
              {active && <Check className="w-3.5 h-3.5" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Slide 2 — a dish tile lands, then the "why this dish" reasons tick in.
const DEMO_DISHES = ["🍳", "🍝", "🥘", "🍲"];
const WHY_LINES = ["Uses your eggs & tomatoes", "One swap for anything missing", "Ready in 25 minutes"];
function RecipeVisual() {
  const [dish, setDish] = useState(0);
  const [lines, setLines] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      setLines(l => {
        if (l >= WHY_LINES.length) { setDish(d => (d + 1) % DEMO_DISHES.length); return 0; }
        return l + 1;
      });
    }, 780);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="w-full rounded-2xl bg-bg-surface border border-border-default p-5">
      <div className="flex items-center gap-3.5">
        <AnimatePresence mode="wait">
          <motion.div
            key={dish}
            initial={{ scale: 0.7, opacity: 0, rotate: -6 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.7, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 22 }}
            className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{
              background: "linear-gradient(145deg, oklch(0.720 0.200 42) 0%, var(--ember) 52%, oklch(0.430 0.180 26) 100%)",
              boxShadow: "inset 0 2px 4px rgba(255,255,255,0.24), 0 4px 0 oklch(0.380 0.155 24), 0 10px 22px oklch(0 0 0 / 0.45)",
            }}
          >
            <span className="text-[32px] leading-none" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))" }}>
              {DEMO_DISHES[dish]}
            </span>
          </motion.div>
        </AnimatePresence>
        <div className="min-w-0">
          <p className="label-eyebrow leading-none">Tonight's match</p>
          <p className="font-display text-[18px] text-text-primary leading-tight mt-1">A recipe from what you have</p>
        </div>
      </div>
      <div className="mt-4 space-y-2 h-[92px]">
        {WHY_LINES.map((line, i) => (
          <motion.div
            key={line}
            initial={false}
            animate={{ opacity: i < lines ? 1 : 0.15, x: i < lines ? 0 : -6 }}
            transition={{ type: "spring", stiffness: 400, damping: 26 }}
            className="flex items-center gap-2.5"
          >
            <span className="w-5 h-5 rounded-full bg-success/15 flex items-center justify-center flex-shrink-0">
              <Check className="w-3 h-3 text-success" />
            </span>
            <span className="text-[13px] text-text-primary">{line}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Slide 3 — a vibe highlights on loop next to a time pill, over the CTA.
const DEMO_VIBES = ["🥬 Use it up", "⚡ Quick", "🍲 Comfort", "🥗 Healthy"];
function TonightVisual() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive(a => (a + 1) % DEMO_VIBES.length), 1100);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="w-full rounded-2xl bg-bg-surface border border-border-default p-5">
      <p className="label-eyebrow mb-3">What matters tonight?</p>
      <div className="flex flex-wrap gap-2">
        {DEMO_VIBES.map((v, i) => {
          const on = i === active;
          return (
            <div
              key={v}
              className={`inline-flex items-center h-9 px-3 rounded-full border text-[13px] font-medium transition-all duration-300 ${
                on ? "bg-ember-glow border-ember-dim text-ember-text" : "bg-bg-elevated border-border-default text-text-secondary"
              }`}
            >
              {v}
            </div>
          );
        })}
      </div>
      <div className="mt-3 inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-bg-elevated border border-border-default text-[12px] font-mono text-text-secondary">
        <Clock className="w-3.5 h-3.5" /> 30 min
      </div>
    </div>
  );
}

type Slide = { Visual: () => JSX.Element; eyebrow: string; title: string; body: string };
const SLIDES: Slide[] = [
  {
    Visual: KitchenVisual,
    eyebrow: "Step 1 · one minute",
    title: "Tell us what you've got",
    body: "Tap the ingredients already in your kitchen — you'll need at least one protein or veg, that's the star we build the dish around.",
  },
  {
    Visual: RecipeVisual,
    eyebrow: "Step 2 · instantly",
    title: "Get one recipe you can actually make",
    body: "We match a dish to exactly what you have — with easy swaps for anything you're missing.",
  },
  {
    Visual: TonightVisual,
    eyebrow: "Step 3 · tonight",
    title: "Cook it, your way",
    body: "Pick a vibe and how long you've got. We'll find something you haven't made before.",
  },
];

function Onboarding() {
  const navigate = useNavigate();
  const [i, setI] = useState(0);
  const isLast = i === SLIDES.length - 1;

  useEffect(() => { track("onboarding_viewed", { slide: 1 }); }, []);

  const finish = (via: "completed" | "skipped") => {
    setOnboarded();
    if (via === "completed") track("onboarding_completed");
    else track("onboarding_skipped", { slide_when_skipped: i + 1 });
    // Replace so onboarding leaves no history entry — a back-swipe from home
    // must never land the user back in the intro.
    navigate({ to: via === "completed" ? "/inventory" : "/", replace: true });
  };

  // Advance via the CTA. Slides only change through this button (no swipe
  // gesture on this screen), so this is the single slide-change instrumentation
  // point. The final tap ("Set up my kitchen") completes rather than advances.
  const goNext = () => {
    if (isLast) { finish("completed"); return; }
    track("onboarding_slide_changed", { from_slide: i + 1, to_slide: i + 2 });
    setI(i + 1);
  };

  const slide = SLIDES[i];
  const Visual = slide.Visual;

  return (
    <MobileFrame>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header — brand + skip */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <span className="font-display text-[22px] font-light text-text-primary tracking-tight">
            Mise<span className="text-ember">.</span>
          </span>
          {!isLast && (
            <button onClick={() => finish("skipped")}
              className="text-[13px] text-text-tertiary font-medium active:opacity-60 transition">
              Skip
            </button>
          )}
        </div>

        {/* Slide body */}
        <div className="flex-1 min-h-0 flex flex-col justify-center px-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -28 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className="flex flex-col gap-6"
            >
              <Visual />
              <div>
                <p className="label-eyebrow text-ember-text">{slide.eyebrow}</p>
                <h1 className="font-display text-[28px] font-light text-text-primary leading-tight mt-2">
                  {slide.title}
                </h1>
                <p className="text-[15px] text-text-secondary leading-relaxed mt-2.5">
                  {slide.body}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer — progress dots + CTA */}
        <div className="px-6 pb-8 pt-2 flex flex-col gap-5">
          <div className="flex justify-center gap-1.5">
            {SLIDES.map((_, idx) => (
              <motion.div
                key={idx}
                animate={{ width: idx === i ? 20 : 6, opacity: idx === i ? 1 : 0.3 }}
                transition={{ type: "spring", stiffness: 400, damping: 22 }}
                className="h-1.5 rounded-full bg-ember"
              />
            ))}
          </div>
          <EmberButton size="lg" className="w-full"
            onClick={goNext}>
            {isLast ? "Set up my kitchen" : "Next"}
            <ArrowRight className="w-4 h-4" />
          </EmberButton>
        </div>
      </div>
    </MobileFrame>
  );
}
