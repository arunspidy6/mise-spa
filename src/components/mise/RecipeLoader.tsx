import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Shared recipe-finding loader — used by both "Find me something" (session) and
// "Not this" (recipe reroll) so the animation is identical. One 3D food tile is
// shown at a time and advances in lock-step with the pagination dots below.

const LOADER_DISHES = [
  { emoji: "🍳", name: "Shakshuka" },
  { emoji: "🥘", name: "Soy-glazed chicken" },
  { emoji: "🍜", name: "Egg fried rice" },
  { emoji: "🥩", name: "Garlic butter steak" },
  { emoji: "🫕", name: "Chickpea curry" },
  { emoji: "🍝", name: "Garlic butter pasta" },
  { emoji: "🐟", name: "Soy-glazed salmon" },
  { emoji: "🍲", name: "Lentil soup" },
];

const LOADER_MESSAGES = [
  "Checking what you have…",
  "Finding something different…",
  "Matching your ingredients…",
  "Almost ready…",
];

// A single large app-icon-style 3D tile — gradient face, depth edge, top sheen.
function BigFoodTile({ emoji }: { emoji: string }) {
  return (
    <motion.div
      animate={{ y: [0, -7, 0] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      className="w-[124px] h-[124px] rounded-[30px] flex items-center justify-center select-none"
      style={{
        background:
          "linear-gradient(145deg, oklch(0.720 0.200 42) 0%, var(--ember) 52%, oklch(0.430 0.180 26) 100%)",
        boxShadow: [
          "inset 0 2px 4px rgba(255,255,255,0.24)",
          "0 6px 0 oklch(0.380 0.155 24)",
          "0 16px 34px oklch(0 0 0 / 0.50)",
        ].join(", "),
      }}
    >
      <span className="text-[58px] leading-none" style={{ filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.40))" }}>
        {emoji}
      </span>
    </motion.div>
  );
}

export function RecipeLoaderContent({
  subtitle = "Something you haven't made before",
}: {
  subtitle?: string;
}) {
  const [idx, setIdx] = useState(0);
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    const dishTimer = setInterval(() => setIdx((i) => (i + 1) % LOADER_DISHES.length), 1000);
    const msgTimer = setInterval(() => setMsgIdx((i) => (i + 1) % LOADER_MESSAGES.length), 1900);
    return () => { clearInterval(dishTimer); clearInterval(msgTimer); };
  }, []);

  const dish = LOADER_DISHES[idx];

  return (
    <div className="flex flex-col items-center justify-center px-8 w-full h-full">
      {/* One 3D tile at a time — slides in as the active dot advances */}
      <div className="relative w-[124px] h-[124px] mb-7">
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ x: 44, opacity: 0, scale: 0.88 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: -44, opacity: 0, scale: 0.88 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            className="absolute inset-0"
          >
            <BigFoodTile emoji={dish.emoji} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Cycling dish name */}
      <div className="h-7 flex items-center justify-center mb-5">
        <AnimatePresence mode="wait">
          <motion.p
            key={idx}
            initial={{ y: 9, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 26 }}
            className="font-display italic text-[18px] font-light text-ember-text text-center"
          >
            {dish.name}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Pagination dots — active dot tracks the current tile */}
      <div className="flex gap-1.5 mb-7">
        {LOADER_DISHES.map((_, i) => (
          <motion.div
            key={i}
            animate={{ width: i === idx ? 18 : 6, opacity: i === idx ? 1 : 0.3 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="h-1.5 rounded-full bg-ember"
          />
        ))}
      </div>

      {/* Cycling status message */}
      <AnimatePresence mode="wait">
        <motion.p
          key={msgIdx}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="font-display text-[19px] font-light text-text-primary text-center"
        >
          {LOADER_MESSAGES[msgIdx]}
        </motion.p>
      </AnimatePresence>

      {subtitle ? <p className="text-[12px] text-text-secondary mt-3 text-center">{subtitle}</p> : null}
    </div>
  );
}
