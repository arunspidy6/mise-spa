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

  const hasSetup = (inventory.lastUpdated ?? 0) > 0;

  return (
    <MobileFrame>
      <div className="flex-1 flex flex-col px-5 pt-14 pb-safe gap-8">

        {/* ── Header ── */}
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
            {getGreeting()} — what are you making?
          </motion.p>
        </motion.div>

        {/* ── Primary + grouped secondary ── */}
        <motion.div
          initial={{ opacity: 0, y: 36, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ ...SPRING, delay: 0.1 }}
          className="flex flex-col gap-2"
        >
          {/* Main CTA — rounded-xl = 14px */}
          <Link to={hasSetup ? "/session" : "/inventory"} className="block">
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
                  <p className="font-display text-[22px] font-light leading-tight" style={{ color: "#0C0806" }}>
                    Just cook something
                  </p>
                  <p className="text-[13px] mt-1" style={{ color: "#3D180A" }}>
                    Best match from your pantry →
                  </p>
                </div>
              </div>
            </motion.div>
          </Link>

          {/* Update kitchen — rounded-lg = 12px */}
          <Link to="/inventory" search={{ from: "home" }} className="block">
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
                <Package className="w-3.5 h-3.5 text-text-secondary" />
              </div>
              <span className="text-[14px] text-text-primary font-medium flex-1">
                {hasSetup ? "Update my kitchen" : "Set up your kitchen"}
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
        </motion.div>

        {/* ── Spacer ── */}
        <div className="flex-1" />

        {/* ── Cooking journal — pinned above quote ── */}
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
                {/* Same badge style as "12 items" */}
                <span className="text-[11px] font-semibold text-ember-text bg-ember-glow px-2.5 py-1 rounded-full border border-ember-dim">
                  {history.length} {history.length === 1 ? "recipe" : "recipes"}
                </span>
              </motion.div>
            </Link>
          </motion.div>
        )}

        {/* ── Footer quote ── */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.7 }}
          className="font-display italic text-[13px] text-text-tertiary text-center"
        >
          "Cook what you have, not what you wish you had."
        </motion.p>

      </div>
    </MobileFrame>
  );
}
