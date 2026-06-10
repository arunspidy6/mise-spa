import { motion } from "framer-motion";

/**
 * Friendly chef bust — clean single-weight line art in the terracotta theme.
 * A well-proportioned toque, a content face, and a chef-jacket collar. Drawn
 * with `--ink`; cheeks use the soft `--ink-soft` wash. Framer Motion gives a
 * spring entrance, a slow idle float, and two twinkling sparkles so it feels
 * alive without the busyness of the earlier version.
 */
export function ChefIllustration({ className }: { className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: 0.84, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 210, damping: 18, delay: 0.12 }}
    >
      {/* Idle float — the chef breathes gently up and down */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4.6, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg width="118" height="118" viewBox="0 0 200 200" fill="none" style={{ overflow: "visible" }}>
          <g
            stroke="var(--ink)"
            strokeWidth={4.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          >
            {/* ── Toque (chef's hat) ── */}
            <path d="M64 80 C50 80 48 60 64 57 C59 41 84 37 92 50 C97 39 103 39 108 50 C116 37 141 41 136 57 C152 60 150 80 136 80 Z" />
            {/* hat band */}
            <path d="M68 80 H132 a6 6 0 0 1 6 6 V90 a6 6 0 0 1 -6 6 H68 a6 6 0 0 1 -6 -6 V86 a6 6 0 0 1 6 -6 Z" />

            {/* ── Face ── */}
            <circle cx="100" cy="124" r="24" />
            {/* content closed eyes */}
            <path d="M87 121 q4.5 4 9 0" />
            <path d="M104 121 q4.5 4 9 0" />
            {/* smile */}
            <path d="M91 133 q9 7 18 0" />

            {/* ── Neck ── */}
            <path d="M94 148 L94 156" />
            <path d="M106 148 L106 156" />

            {/* ── Chef-jacket collar (double-breasted) ── */}
            <path d="M80 170 L100 157 L120 170" />
            <path d="M100 157 L100 166" />
            {/* shoulders */}
            <path d="M80 170 C72 174 66 186 64 200" />
            <path d="M120 170 C128 174 134 186 136 200" />
          </g>

          {/* jacket buttons */}
          <g fill="var(--ink)">
            <circle cx="90" cy="180" r="2.4" />
            <circle cx="90" cy="191" r="2.4" />
            <circle cx="110" cy="180" r="2.4" />
            <circle cx="110" cy="191" r="2.4" />
          </g>

          {/* rosy cheeks */}
          <circle cx="83" cy="131" r="4" fill="var(--ink-soft)" />
          <circle cx="117" cy="131" r="4" fill="var(--ink-soft)" />

          {/* ── Twinkling sparkles ── */}
          <motion.path
            d="M48 52 q2.5 6 8 7 q-5.5 1 -8 7 q-2.5 -6 -8 -7 q5.5 -1 8 -7 Z"
            fill="var(--ink)"
            animate={{ scale: [0.5, 1, 0.5], opacity: [0.15, 0.85, 0.15] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: "48px 59px" }}
          />
          <motion.path
            d="M153 70 q2 5 6.5 6 q-4.5 1 -6.5 6 q-2 -5 -6.5 -6 q4.5 -1 6.5 -6 Z"
            fill="var(--ink)"
            animate={{ scale: [0.5, 1, 0.5], opacity: [0.15, 0.7, 0.15] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", delay: 1.1 }}
            style={{ transformOrigin: "153px 76px" }}
          />
        </svg>
      </motion.div>
    </motion.div>
  );
}
