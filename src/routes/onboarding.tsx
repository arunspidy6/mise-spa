import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Clock, ArrowLeftRight } from "lucide-react";
import { MobileFrame } from "@/components/mise/MobileFrame";
import { EmberButton } from "@/components/mise/EmberButton";
import { RecipeImage } from "@/components/mise/RecipeImage";
import { setOnboarded } from "@/lib/onboarding";
import { track } from "@/lib/analytics";

export const Route = createFileRoute("/onboarding")({ component: Onboarding });

// Single-screen intro. The old three-slide carousel made the app feel long
// before it started; this compresses the whole pitch to one sentence plus one
// piece of static proof — a real example the recipe engine can produce — and a
// single CTA straight into the 6-step kitchen setup. There is nothing to skip.

// The proof, in the app's own vocabulary: three everyday ingredients and the
// actual dish they yield. Shakshuka (eggs poached in a tomato–onion sauce) is a
// genuine output for this exact input, so the card is honest, not marketing.
const PROOF_INGREDIENTS = ["🥚 Eggs", "🧅 Onion", "🍅 Tomatoes"];

const RISE = { type: "spring" as const, stiffness: 320, damping: 26 };

function Onboarding() {
  const navigate = useNavigate();

  useEffect(() => { track("onboarding_viewed"); }, []);

  const start = () => {
    setOnboarded();
    track("onboarding_completed");
    // Replace so onboarding leaves no history entry — a back-swipe from the
    // setup flow must never land the user back on the intro.
    navigate({ to: "/inventory", replace: true });
  };

  return (
    <MobileFrame>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header — brand only. Nothing to skip past, so no skip link. */}
        <div className="flex items-center px-6 pt-6 pb-2">
          <span className="font-display text-[22px] font-light text-text-primary tracking-tight">
            Mise<span className="text-ember">.</span>
          </span>
        </div>

        {/* Body — the whole story on one screen, vertically centred. */}
        <div className="flex-1 min-h-0 flex flex-col justify-center px-6 gap-6">

          {/* The pitch — one sentence, payoff in ember. */}
          <motion.h1
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...RISE, delay: 0.04 }}
            className="font-display text-[29px] font-light text-text-primary leading-[1.2] tracking-tight"
          >
            Tell us what's in your kitchen. Get recipes you can{" "}
            <span className="text-ember italic font-normal">actually make</span>.
          </motion.h1>

          {/* The proof — the single most important element. Static, no tap
              required: a real dish photo (the payoff) with the everyday
              ingredients it came from, styled like an actual recipe result. */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...RISE, delay: 0.14 }}
            className="rounded-2xl bg-bg-surface border border-border-default overflow-hidden"
            style={{ boxShadow: "0 4px 24px oklch(0 0 0 / 0.28)" }}
          >
            {/* The dish you get — a real Shakshuka photo (TheMealDB), with a
                warm Mediterranean gradient + 🍳 fallback while it loads. */}
            <RecipeImage cuisine="Mediterranean" alt="Shakshuka" className="aspect-[2/1]" />

            <div className="px-4 pt-3 pb-4">
              {/* Cuisine + time, exactly as the real recipe card shows them. */}
              <div className="flex flex-wrap gap-2 mb-2">
                <span className="bg-ember-glow text-ember-text text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full">
                  Mediterranean
                </span>
                <span className="bg-bg-elevated text-text-secondary text-[10px] font-mono px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Clock className="w-3 h-3" />20 min
                </span>
              </div>
              <h2 className="font-display text-[22px] font-normal text-text-primary leading-tight tracking-tight">
                Shakshuka
              </h2>

              {/* From what you have — the input, as chips. */}
              <div className="mt-3 pt-3 border-t border-border-subtle">
                <p className="label-eyebrow mb-2">From what's in your kitchen</p>
                <div className="flex flex-wrap gap-1.5">
                  {PROOF_INGREDIENTS.map(item => (
                    <span
                      key={item}
                      className="inline-flex items-center h-7 px-2.5 rounded-full bg-bg-elevated border border-border-default text-[12px] font-medium text-text-secondary"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-1.5 mt-3">
                <ArrowLeftRight className="w-3.5 h-3.5 text-ember-text flex-shrink-0" />
                <span className="text-[12px] text-text-secondary leading-snug">
                  One swap if you're missing something
                </span>
              </div>
            </div>
          </motion.div>

          {/* Kills the length anxiety — it's short, and it's a one-time cost. */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.32, duration: 0.4 }}
            className="text-[14px] text-text-secondary text-center leading-relaxed"
          >
            Takes about a minute. We'll remember it after that.
          </motion.p>
        </div>

        {/* Footer — one CTA, straight into the real 6-step flow. */}
        <div className="px-6 pb-8 pt-2">
          <EmberButton size="lg" className="w-full" onClick={start}>
            Set up my kitchen <ArrowRight className="w-4 h-4" />
          </EmberButton>
        </div>
      </div>
    </MobileFrame>
  );
}
