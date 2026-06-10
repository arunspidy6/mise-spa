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
  const caption           = hasSetup ? "What are you cooking?" : "Let's get you cooking.";

  return (
    <MobileFrame className="theme-terracotta">
      <div className="flex-1 flex flex-col relative overflow-hidden">

        {/* ── Centre block — left-aligned, vertically centred ── */}
        <div className="flex-1 flex flex-col justify-center px-7">

          {/* Wordmark */}
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING, delay: 0.05 }}
            className="font-display text-[42px] font-light leading-none text-text-primary mb-3"
          >
            Mise<span className="text-ember">.</span>
          </motion.h1>

          {/* Compact single-line subtitle: icon + greeting + caption */}
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...SPRING, delay: 0.15 }}
            className="flex items-center gap-2 mb-8"
          >
            <span className="text-[18px] leading-none">{getTimeIcon()}</span>
            <p
              className="text-[14px] font-medium"
              style={{ color: "rgba(255,255,255,0.70)" }}
            >
              {getGreeting()}! {caption}
            </p>
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING, delay: 0.32 }}
            className="flex flex-col gap-2.5"
          >
            {/* Primary CTA */}
            <Link to={mainCTATo} className="block">
              <motion.div
                whileHover={{ scale: 1.015, transition: { type: "spring", stiffness: 500, damping: 22 } }}
                whileTap={{ scale: 0.97 }}
                className="relative overflow-hidden rounded-2xl flex items-center gap-4 px-5 py-4"
                style={{
                  background: "var(--ember)",
                  boxShadow: "var(--shadow-button)",
                  color: "var(--on-ember)",
                }}
              >
                {/* Icon tile — rounded square matching the other button icons */}
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.18)" }}
                >
                  <UtensilsCrossed className="w-5 h-5" style={{ color: "var(--on-ember)" }} />
                </div>
                <div className="flex-1">
                  <p className="font-display text-[22px] font-light leading-tight">Cook something</p>
                  <p className="text-[12px] mt-0.5" style={{ opacity: 0.80 }}>{mainCTASub}</p>
                </div>
                <ArrowRight className="w-5 h-5 flex-shrink-0 opacity-70" />
              </motion.div>
            </Link>

            {/* Update kitchen — only when already set up + cooked before */}
            {showUpdateKitchen && (
              <Link to="/inventory" search={{ from: "home" }} className="block">
                <motion.div
                  whileTap={{ scale: 0.98 }}
                  className="h-12 rounded-xl flex items-center px-4 gap-3"
                  style={{
                    background: "rgba(0,0,0,0.20)",
                    border: "1px solid rgba(255,255,255,0.14)",
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(0,0,0,0.25)" }}
                  >
                    <Package className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.80)" }} />
                  </div>
                  <span
                    className="text-[14px] font-medium flex-1"
                    style={{ color: "rgba(255,255,255,0.88)" }}
                  >
                    Update my kitchen
                  </span>
                  {itemCount > 0 && (
                    <span
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: "rgba(0,0,0,0.30)", color: "rgba(255,255,255,0.88)" }}
                    >
                      {itemCount} items
                    </span>
                  )}
                </motion.div>
              </Link>
            )}
          </motion.div>
        </div>

        {/* ── Bottom: journal → tagline (single line) ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.50, duration: 0.45 }}
          className="flex-shrink-0 px-7 pb-safe pt-3 flex flex-col gap-2.5"
        >
          {history.length > 0 && (
            <Link to="/history" className="block">
              <motion.div
                whileTap={{ scale: 0.98 }}
                className="h-13 rounded-xl flex items-center px-4 gap-3"
                style={{
                  background: "rgba(0,0,0,0.22)",
                  border: "1px solid rgba(255,255,255,0.14)",
                }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(0,0,0,0.28)" }}
                >
                  <Clock className="w-4 h-4" style={{ color: "rgba(255,255,255,0.75)" }} />
                </div>
                <span
                  className="text-[14px] font-medium flex-1"
                  style={{ color: "rgba(255,255,255,0.90)" }}
                >
                  My cooking journal
                </span>
                {/* High-contrast pill — solid dark bg, white text */}
                <span
                  className="text-[12px] font-semibold px-3 py-1 rounded-full"
                  style={{
                    background: "rgba(0,0,0,0.50)",
                    color: "rgba(255,255,255,0.95)",
                    border: "1px solid rgba(255,255,255,0.15)",
                  }}
                >
                  {history.length} {history.length === 1 ? "recipe" : "recipes"}
                </span>
              </motion.div>
            </Link>
          )}

          {/* Tagline — single line, below journal */}
          <p
            className="text-[12px] text-center pb-1"
            style={{ color: "rgba(255,255,255,0.48)", fontStyle: "italic" }}
          >
            Cook what you have, not what you wish you had.
          </p>
        </motion.div>

      </div>
    </MobileFrame>
  );
}
