import { motion } from "framer-motion";

type CuisineTileProps = {
  id: string;
  label: string;
  emoji: string;
  color: string;
  selected?: boolean;
  onPress?: () => void;
  delay?: number;
};

export function CuisineTile({
  label,
  emoji,
  color,
  selected = false,
  onPress,
  delay = 0,
}: CuisineTileProps) {
  return (
    <motion.button
      type="button"
      onClick={onPress}
      aria-pressed={selected}
      initial={{ opacity: 0, y: 18, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 340, damping: 22, delay }}
      whileHover={{ y: -3, transition: { type: "spring", stiffness: 500, damping: 20 } }}
      whileTap={{ scale: 0.93 }}
      className="relative flex flex-col items-center justify-center py-4 px-2 gap-2.5 rounded-2xl overflow-hidden text-left"
      style={{
        background: `linear-gradient(165deg, ${color}28 0%, ${color}12 45%, var(--bg-surface) 100%)`,
        border: `1px solid ${selected ? color + "60" : "oklch(0.31 0.011 60 / 0.7)"}`,
        boxShadow: selected
          ? `0 0 18px ${color}35, 0 2px 10px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)`
          : "0 2px 10px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)",
        transition: "border-color 0.2s, box-shadow 0.2s",
      }}
    >
      {/* 3D emoji container */}
      <motion.div
        animate={selected ? { scale: [1, 1.15, 1] } : {}}
        transition={{ duration: 0.3 }}
        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
        style={{
          background: `linear-gradient(145deg, ${color}35 0%, ${color}15 100%)`,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.18), 0 3px 10px rgba(0,0,0,0.35)`,
        }}
      >
        {emoji}
      </motion.div>

      {/* Label */}
      <span
        className="text-[11px] font-semibold leading-tight text-center"
        style={{
          color: selected ? color : "var(--text-secondary)",
          transition: "color 0.2s",
          letterSpacing: "0.02em",
        }}
      >
        {label}
      </span>

      {/* Selected checkmark badge */}
      {selected && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 22 }}
          className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
          style={{
            background: color,
            boxShadow: `0 2px 8px ${color}60`,
          }}
        >
          <span className="text-[9px] font-bold text-white leading-none">✓</span>
        </motion.div>
      )}

      {/* Hover shimmer overlay */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{ background: `linear-gradient(135deg, ${color}0A 0%, transparent 60%)` }}
      />
    </motion.button>
  );
}
