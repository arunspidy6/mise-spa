import { motion, AnimatePresence } from "framer-motion";
import { Check, Shuffle, Plus, ArrowRight } from "lucide-react";

// Screen 4 — only shown when the best dish we can build is genuinely missing an
// ESSENTIAL ingredient. We never fake it (no "creamy pasta, minus the cream").
// We hand the user three honest routes forward.
export function AdjustSheet({
  open,
  missing,
  hasAlternative,
  onWithWhatIHave,
  onChooseAnother,
  onAddIngredient,
}: {
  open: boolean;
  missing: string[];
  hasAlternative: boolean;
  onWithWhatIHave: () => void;
  onChooseAnother: () => void;
  onAddIngredient: () => void;
}) {
  const missingText =
    missing.length === 0
      ? "one key ingredient"
      : missing.length === 1
        ? missing[0].toLowerCase()
        : `${missing.slice(0, -1).join(", ").toLowerCase()} and ${missing[missing.length - 1].toLowerCase()}`;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 bg-bg-base/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
            className="absolute inset-x-0 bottom-0 z-50 rounded-t-2xl bg-bg-elevated border-t border-border-default px-5 pt-4 pb-8"
          >
            <div className="w-10 h-1 rounded-full bg-border-strong mx-auto mb-5" />
            <h2 className="font-display text-[22px] font-light text-text-primary">Let's adjust your meal</h2>
            <p className="text-[13px] text-text-secondary mt-1.5 leading-relaxed">
              The best match for these needs <span className="text-text-primary font-medium">{missingText}</span>,
              which you haven't mentioned. Rather than fake it, here's how we can keep going.
            </p>

            <div className="mt-5 space-y-2.5">
              <Option
                recommended
                icon={<Check className="w-4 h-4" strokeWidth={2.5} />}
                title="Create a version with what I have"
                sub="We'll build a coherent dish around your ingredients"
                onClick={onWithWhatIHave}
              />
              <Option
                icon={<Shuffle className="w-4 h-4" />}
                title="Choose another meal"
                sub={hasAlternative ? "See a different idea for tonight" : "Start over with a fresh suggestion"}
                onClick={onChooseAnother}
              />
              <Option
                icon={<Plus className="w-4 h-4" />}
                title="Add the missing ingredient"
                sub="Tell us you have it and we'll rebuild"
                onClick={onAddIngredient}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Option({
  icon,
  title,
  sub,
  recommended,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  recommended?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-xl border px-4 py-3 flex items-center gap-3 text-left transition-all active:scale-[0.98] ${
        recommended ? "bg-ember-glow border-ember-dim" : "bg-bg-surface border-border-default"
      }`}
    >
      <span
        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
          recommended ? "bg-ember text-on-ember" : "bg-bg-raised text-text-secondary"
        }`}
      >
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2">
          <span className="text-[14px] font-medium text-text-primary">{title}</span>
          {recommended && (
            <span className="text-[9px] font-semibold uppercase tracking-wider text-ember-text bg-ember/15 px-1.5 py-0.5 rounded-full">
              Recommended
            </span>
          )}
        </span>
        <span className="block text-[12px] text-text-tertiary mt-0.5 leading-snug">{sub}</span>
      </span>
      <ArrowRight className="w-4 h-4 text-text-tertiary flex-shrink-0" />
    </button>
  );
}
