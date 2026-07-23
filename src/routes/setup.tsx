import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Mic, ListChecks, ArrowRight } from "lucide-react";
import { MobileFrame } from "@/components/mise/MobileFrame";
import { track } from "@/lib/analytics";
import { hapticLight } from "@/lib/haptics";

export const Route = createFileRoute("/setup")({ component: SetupChoice });

const SPRING = { type: "spring" as const, stiffness: 320, damping: 26 };

// The fork in the road: both ways to fill the kitchen live side by side and the
// user picks. We record which they choose (setup_method_chosen); the honest
// "what do people prefer" signal is per-path completion downstream, not this
// click alone — so both choices are framed neutrally, no default nudge.
function SetupChoice() {
  const navigate = useNavigate();

  const choose = (method: "voice" | "manual", to: "/dump" | "/inventory") => {
    hapticLight();
    track("setup_method_chosen", { method });
    navigate({ to });
  };

  return (
    <MobileFrame>
      <div className="flex flex-col h-full overflow-hidden px-6 pt-6 pb-8">
        <span className="font-display text-[20px] font-light text-text-primary tracking-tight">
          Mise<span className="text-ember">.</span>
        </span>

        <div className="flex-1 min-h-0 flex flex-col justify-center gap-7">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING, delay: 0.04 }}
          >
            <h1 className="font-display text-[30px] font-light text-text-primary leading-tight tracking-tight">
              How do you want to add your ingredients?
            </h1>
            <p className="text-[14px] text-text-secondary mt-2.5 leading-relaxed">
              Two ways in — pick whichever feels easier. You can always change your kitchen later.
            </p>
          </motion.div>

          <div className="flex flex-col gap-3.5">
            {/* Voice / dump — speed */}
            <motion.button
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING, delay: 0.12 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => choose("voice", "/dump")}
              className="text-left rounded-2xl bg-bg-surface border border-border-default px-5 py-4 flex items-center gap-4 active:opacity-90"
            >
              <span className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--ember-gradient)", boxShadow: "var(--shadow-button)", color: "var(--on-ember)" }}>
                <Mic className="w-5 h-5" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-display text-[19px] font-light text-text-primary leading-tight">Speak your ingredients</span>
                <span className="block text-[12.5px] text-text-secondary mt-1 leading-snug">
                  Say or type what you've got — the fastest way in.
                </span>
              </span>
              <ArrowRight className="w-4 h-4 text-text-tertiary flex-shrink-0" />
            </motion.button>

            {/* Manual wizard — accuracy */}
            <motion.button
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING, delay: 0.2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => choose("manual", "/inventory")}
              className="text-left rounded-2xl bg-bg-surface border border-border-default px-5 py-4 flex items-center gap-4 active:opacity-90"
            >
              <span className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-bg-raised text-text-secondary">
                <ListChecks className="w-5 h-5" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-display text-[19px] font-light text-text-primary leading-tight">Tap through it</span>
                <span className="block text-[12.5px] text-text-secondary mt-1 leading-snug">
                  Pick from lists, step by step — the most thorough way.
                </span>
              </span>
              <ArrowRight className="w-4 h-4 text-text-tertiary flex-shrink-0" />
            </motion.button>
          </div>
        </div>

        <p className="text-[12px] text-center text-text-tertiary italic">
          Cook what you have, not what you wish you had.
        </p>
      </div>
    </MobileFrame>
  );
}
