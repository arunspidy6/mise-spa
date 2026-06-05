import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Package, Clock } from "lucide-react";
import { MobileFrame } from "@/components/mise/MobileFrame";
import { useMise } from "@/store/mise";

export const Route = createFileRoute("/")({ component: Home });

const SPRING      = { type: "spring" as const, stiffness: 360, damping: 22, mass: 0.9 };
const SPRING_SLOW = { type: "spring" as const, stiffness: 260, damping: 26, mass: 1 };

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5)  return "🌙 Good night";
  if (h < 12) return "☀️ Good morning";
  if (h < 17) return "🌤 Good afternoon";
  if (h < 21) return "🌆 Good evening";
  return "🌙 Good night";
}

function Home() {
  const inventory = useMise(s => s.inventory);
  const history   = useMise(s => s.history);

  const itemCount =
    (inventory.proteins?.length   ?? 0) +
    (inventory.carbs?.length      ?? 0) +
    (inventory.vegetables?.length ?? 0) +
    (inventory.fridge?.length     ?? 0);

  // lastUpdated is set when user completes the inventory flow ("Show me recipes")
  const hasSetup      = (inventory.lastUpdated ?? 0) > 0;
  // "Update kitchen" only surfaces once the user has cooked at least once —
  // they've completed the full loop so the button makes contextual sense.
  const showUpdateKitchen = hasSetup && history.length > 0;
  // First-timers: "Cook something" is their on-ramp into inventory setup.
  // Returning users: go straight to the recipe-finding session.
  const mainCTATo     = hasSetup ? "/session" : "/inventory";
  const mainCTASub    = hasSetup
    ? "Best match from your pantry →"
    : "First, let's see what you've got →";
  const homeSubtitle  = hasSetup
    ? "What are you cooking?"
    : "Let's get you cooking.";

  return (
    <MobileFrame>
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* ── Vertically centred main content — scrollable on short screens ── */}
        <div className="flex-1 min-h-0 flex flex-col justify-center overflow-y-auto px-5 gap-7 relative z-10 py-8">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING, delay: 0.04 }}
          >
            <h1 className="font-display text-[48px] font-light text-text-primary leading-none">
              Mise<span className="text-ember">.</span>
            </h1>
            <motion.p
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...SPRING_SLOW, delay: 0.14 }}
              className="mt-2 text-[15px] text-text-secondary"
            >
              {getGreeting()}! {homeSubtitle}
            </motion.p>
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 36, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ ...SPRING, delay: 0.1 }}
            className="flex flex-col gap-2"
          >
            {/* Main CTA — destination and subtitle adapt to onboarding state */}
            <Link to={mainCTATo} className="block">
              <motion.div
                whileHover={{ scale: 1.016, transition: { type: "spring", stiffness: 500, damping: 22 } }}
                whileTap={{ scale: 0.963, transition: { duration: 0.1 } }}
                className="relative overflow-hidden rounded-xl"
                style={{
                  background: "var(--ember)",
                  boxShadow: "var(--shadow-button)",
                }}
              >
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 rounded-t-xl"
                  style={{ height: "40%", background: "linear-gradient(to bottom, rgba(255,255,255,0.08), transparent)" }}
                />
                <div className="relative flex items-center gap-4 px-5 py-5">
                  <motion.div
                    animate={{ rotate: [0, -8, 8, -4, 4, 0], scale: [1, 1.08, 1.08, 1.03, 1.03, 1] }}
                    transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 6, ease: "easeInOut" }}
                    className="w-14 h-14 rounded-xl flex items-center justify-center text-[28px] flex-shrink-0"
                    style={{
                      background: "rgba(0,0,0,0.18)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.14)",
                    }}
                  >
                    🍽️
                  </motion.div>
                  <div className="flex-1">
                    <p className="font-display text-[22px] font-light leading-tight" style={{ color: "var(--on-ember)" }}>
                      Cook something
                    </p>
                    <p className="text-[13px] mt-1" style={{ color: "var(--on-ember)", opacity: 0.75 }}>
                      {mainCTASub}
                    </p>
                  </div>
                </div>
              </motion.div>
            </Link>

            {/* Update kitchen — only shown after first recipe is cooked */}
            {showUpdateKitchen && (
              <Link to="/inventory" search={{ from: "home" }} className="block">
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...SPRING, delay: 0.18 }}
                  whileTap={{ scale: 0.97 }}
                  className="h-12 rounded-lg flex items-center px-4 gap-3"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-default)",
                    boxShadow: "var(--shadow-card)",
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ background: "var(--bg-raised)" }}
                  >
                    <Package className="w-3.5 h-3.5 text-text-secondary" />
                  </div>
                  <span className="text-[14px] text-text-primary font-medium flex-1">
                    Update my kitchen
                  </span>
                  {itemCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ ...SPRING, delay: 0.4 }}
                      className="text-[11px] font-semibold text-ember-text bg-ember-glow px-2.5 py-1 rounded-full border border-ember-dim"
                    >
                      {itemCount} items
                    </motion.span>
                  )}
                </motion.div>
              </Link>
            )}
          </motion.div>
        </div>

        {/* ── Bottom: journal + quote ── */}
        <div className="flex-shrink-0 px-5 pb-safe flex flex-col gap-3 relative z-10">
          {history.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING_SLOW, delay: 0.3 }}
            >
              <Link to="/history" className="block">
                <motion.div
                  whileTap={{ scale: 0.97 }}
                  className="h-12 rounded-lg flex items-center px-4 gap-3"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-default)",
                    boxShadow: "var(--shadow-card)",
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ background: "var(--bg-raised)" }}
                  >
                    <Clock className="w-3.5 h-3.5 text-text-secondary" />
                  </div>
                  <span className="text-[14px] text-text-primary font-medium flex-1">
                    My cooking journal
                  </span>
                  <span className="text-[11px] font-semibold text-ember-text bg-ember-glow px-2.5 py-1 rounded-full border border-ember-dim">
                    {history.length} {history.length === 1 ? "recipe" : "recipes"}
                  </span>
                </motion.div>
              </Link>
            </motion.div>
          )}

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.7 }}
            className="font-display italic text-[13px] text-text-tertiary text-center pb-2"
          >
            "Cook what you have, not what you wish you had."
          </motion.p>
        </div>

      </div>
    </MobileFrame>
  );
}
