import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Package, Clock, ArrowRight, UtensilsCrossed } from "lucide-react";
import { MobileFrame } from "@/components/mise/MobileFrame";
import { useMise } from "@/store/mise";

export const Route = createFileRoute("/")({ component: Home });

const SPRING = { type: "spring" as const, stiffness: 320, damping: 24, mass: 0.9 };

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5)  return "Good night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}

function getTimeIcon() {
  const h = new Date().getHours();
  if (h < 5)  return "🌙";
  if (h < 12) return "🌅";
  if (h < 17) return "🌤️";
  if (h < 21) return "🌇";
  return "🌙";
}

function Home() {
  const inventory = useMise(s => s.inventory);
  const history   = useMise(s => s.history);

  const itemCount =
    (inventory.proteins?.length   ?? 0) +
    (inventory.carbs?.length      ?? 0) +
    (inventory.vegetables?.length ?? 0) +
    (inventory.fridge?.length     ?? 0);

  const hasSetup          = (inventory.lastUpdated ?? 0) > 0;
  const showUpdateKitchen = hasSetup && history.length > 0;
  const mainCTATo         = hasSetup ? "/session" : "/inventory";
  const mainCTASub        = hasSetup
    ? "Best match from your pantry"
    : "First, let's see what you've got";
  const caption = hasSetup ? "What are you cooking?" : "Let's get you cooking.";

  return (
    <MobileFrame>
      <div className="flex-1 flex flex-col px-6 overflow-hidden">

        {/* ── CENTRE BLOCK — vertically fills available space, content centred ── */}
        <div className="flex-1 flex flex-col justify-center gap-5 min-h-0">

          {/* Identity */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING, delay: 0.04 }}
          >
            <h1 className="font-display text-[54px] font-light leading-none text-text-primary tracking-tight mb-3">
              Mise<span className="text-ember">.</span>
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-[17px] leading-none">{getTimeIcon()}</span>
              <p className="text-[14px] text-text-secondary leading-snug">
                {getGreeting()}.{" "}
                <span className="text-text-primary font-medium">{caption}</span>
              </p>
            </div>
          </motion.div>

          {/* Primary CTA — flat shadow only, no coloured glow */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING, delay: 0.16 }}
          >
            <Link to={mainCTATo} className="block">
              <motion.div
                whileHover={{ scale: 1.012, transition: { type: "spring", stiffness: 500, damping: 22 } }}
                whileTap={{ scale: 0.97 }}
                className="rounded-2xl flex items-center gap-4 px-5 py-5"
                style={{
                  background: "var(--ember)",
                  boxShadow: "0 4px 16px oklch(0 0 0 / 0.35)",
                  color: "var(--on-ember)",
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.20)" }}
                >
                  <UtensilsCrossed className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display text-[24px] font-light leading-tight">Cook something</p>
                  <p className="text-[12px] mt-0.5" style={{ opacity: 0.72 }}>{mainCTASub}</p>
                </div>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.20)" }}
                >
                  <ArrowRight className="w-4 h-4" />
                </div>
              </motion.div>
            </Link>
          </motion.div>

          {/* Update kitchen — secondary, only after first setup */}
          {showUpdateKitchen && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING, delay: 0.28 }}
            >
              <Link to="/inventory" search={{ from: "home" }} className="block">
                <motion.div
                  whileTap={{ scale: 0.98 }}
                  className="rounded-xl flex items-center gap-3.5 px-4 py-3.5 bg-bg-surface border border-border-default"
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-bg-raised">
                    <Package className="w-4 h-4 text-text-secondary" />
                  </div>
                  <span className="text-[14px] text-text-primary font-medium flex-1">
                    Update my kitchen
                  </span>
                  {itemCount > 0 && (
                    <span className="text-[12px] font-semibold px-2.5 py-1 rounded-full bg-bg-raised text-text-tertiary">
                      {itemCount} items
                    </span>
                  )}
                </motion.div>
              </Link>
            </motion.div>
          )}

        </div>{/* end centre block */}

        {/* ── ZONE 3 — Utility / History ───────────────────────────────────
            Journal sits at the bottom — it's secondary. Ember-tinted count
            pill gives it a visual tie back to the brand without competing
            with the primary CTA. */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.40, duration: 0.45 }}
          className="flex flex-col gap-3 pb-safe"
        >
          {history.length > 0 && (
            <Link to="/history" className="block">
              <motion.div
                whileTap={{ scale: 0.98 }}
                className="rounded-xl flex items-center gap-3.5 px-4 py-3.5 bg-bg-surface border border-border-default"
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-bg-raised">
                  <Clock className="w-4 h-4 text-text-secondary" />
                </div>
                <span className="text-[14px] text-text-primary font-medium flex-1">
                  My cooking journal
                </span>
                <span
                  className="text-[12px] font-semibold px-2.5 py-1 rounded-full"
                  style={{
                    background: "var(--ember-glow)",
                    color: "var(--ember-text)",
                    border: "1px solid var(--ember-dim)",
                  }}
                >
                  {history.length} {history.length === 1 ? "recipe" : "recipes"}
                </span>
              </motion.div>
            </Link>
          )}

          <p className="text-[12px] text-center text-text-tertiary italic pb-2">
            Cook what you have, not what you wish you had.
          </p>
        </motion.div>

      </div>
    </MobileFrame>
  );
}
