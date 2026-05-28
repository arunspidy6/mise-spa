import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, spring } from "framer-motion";
import { Package, Clock } from "lucide-react";
import { MobileFrame } from "@/components/mise/MobileFrame";
import { useMise } from "@/store/mise";

export const Route = createFileRoute("/")({ component: Home });

// Swiggy-inspired bouncy spring config
const BOUNCE = {
  type: "spring" as const,
  stiffness: 400,
  damping: 18,
  mass: 0.8,
};

const BOUNCE_SLOW = {
  type: "spring" as const,
  stiffness: 280,
  damping: 22,
  mass: 1,
};

function Home() {
  const inventory = useMise(s => s.inventory);
  const history = useMise(s => s.history);
  const itemCount = inventory.proteins.length + inventory.carbs.length +
    inventory.vegetables.length + inventory.fridge.length;
  const hasSetup = (inventory.lastUpdated ?? 0) > 0;

  return (
    <MobileFrame>
      <div className="flex-1 flex flex-col px-6">
        <div className="flex-1 flex flex-col justify-center gap-5">

          {/* Wordmark — drops in from above with bounce */}
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...BOUNCE, delay: 0.05 }}
          >
            <h1 className="font-display text-[44px] font-light text-text-primary leading-none">
              Mise<span className="text-ember">.</span>
            </h1>
            <motion.p
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...BOUNCE_SLOW, delay: 0.18 }}
              className="mt-3 text-[16px] text-text-secondary"
            >
              What are you making tonight?
            </motion.p>
          </motion.div>

          {/* Main CTA — pops up from below with spring */}
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ ...BOUNCE, delay: 0.12 }}
          >
            <Link to={hasSetup ? "/session" : "/inventory"} className="block">
              <motion.div
                whileHover={{ scale: 1.02, transition: { ...BOUNCE, delay: 0 } }}
                whileTap={{ scale: 0.96, transition: { duration: 0.1 } }}
                className="h-24 rounded-2xl bg-ember flex items-center px-5 gap-4 shadow-[0_4px_24px_rgba(232,117,26,0.45)]"
              >
                {/* Plate icon with gentle continuous wobble */}
                <motion.div
                  animate={{
                    rotate: [0, -6, 6, -3, 3, 0],
                    scale: [1, 1.05, 1.05, 1.02, 1.02, 1],
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    repeatDelay: 5,
                    ease: "easeInOut",
                  }}
                  className="w-12 h-12 rounded-full bg-ember-dim flex items-center justify-center text-2xl flex-shrink-0"
                >
                  🍽️
                </motion.div>
                <div>
                  <p className="font-display text-[22px] font-light text-bg-base leading-tight">
                    Just cook something
                  </p>
                  <p className="text-[12px] text-bg-base/60 mt-0.5">Best match from what you have</p>
                </div>
              </motion.div>
            </Link>
          </motion.div>

          {/* Secondary cards — staggered pop-in */}
          <div className="flex flex-col gap-2">
            <motion.div
              initial={{ opacity: 0, y: 32, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ ...BOUNCE, delay: 0.22 }}
            >
              <Link to="/inventory" search={{ from: "home" }} className="block">
                <motion.div
                  whileTap={{ scale: 0.97 }}
                  className="h-14 rounded-xl bg-bg-surface border border-border-default flex items-center px-4 gap-3"
                >
                  <Package className="w-4 h-4 text-text-secondary" />
                  <span className="text-[14px] text-text-primary flex-1">
                    {hasSetup ? "Update my kitchen" : "Set up your kitchen"}
                  </span>
                  {itemCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ ...BOUNCE, delay: 0.4 }}
                      className="text-[11px] font-mono text-ember-text bg-ember-glow px-2.5 py-1 rounded-full border border-ember-dim"
                    >
                      {itemCount} items
                    </motion.span>
                  )}
                </motion.div>
              </Link>
            </motion.div>

            {history.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ ...BOUNCE, delay: 0.28 }}
              >
                <Link to="/history" className="block">
                  <motion.div
                    whileTap={{ scale: 0.97 }}
                    className="h-14 rounded-xl bg-bg-surface border border-border-default flex items-center px-4 gap-3"
                  >
                    <Clock className="w-4 h-4 text-text-secondary" />
                    <span className="text-[14px] text-text-primary flex-1">My cooking journal</span>
                    <span className="text-[11px] font-mono text-text-tertiary">{history.length} cooked</span>
                  </motion.div>
                </Link>
              </motion.div>
            )}
          </div>
        </div>

        {/* Footer quote — fades in last */}
        <div className="pb-10 pt-4">
          {history[0] ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="text-[13px] text-text-secondary text-center"
            >
              Last cooked: <span className="text-text-primary">{history[0].name}</span>
            </motion.p>
          ) : (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="font-display italic text-[14px] text-text-tertiary text-center"
            >
              "Cook what you have, not what you wish you had."
            </motion.p>
          )}
        </div>
      </div>
    </MobileFrame>
  );
}
