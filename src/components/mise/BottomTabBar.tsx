import { useNavigate, useRouterState } from "@tanstack/react-router";
import { CookingPot, Refrigerator, BookMarked } from "lucide-react";
import { useMobileFrame } from "@/components/mise/MobileFrame";

// Primary navigation for the dump-variant app: Cook (add ingredients + find a
// recipe), Kitchen (what you have, editable), Cookbook (saved + cooked).
// Rendered as the bottom-most element of each top-level tab screen. Hidden while
// the keyboard is open so it never covers the field being typed into.
const TABS = [
  { to: "/dump" as const, label: "Cook", icon: CookingPot },
  { to: "/kitchen" as const, label: "Kitchen", icon: Refrigerator },
  { to: "/history" as const, label: "Cookbook", icon: BookMarked },
];

export function BottomTabBar() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { keyboardOpen } = useMobileFrame();
  if (keyboardOpen) return null;

  return (
    <nav className="flex-shrink-0 flex border-t border-border-subtle bg-bg-base/95 backdrop-blur-sm px-2 pt-1.5 pb-safe">
      {TABS.map((t) => {
        const active = pathname === t.to;
        const Icon = t.icon;
        return (
          <button
            key={t.to}
            onClick={() => { if (!active) navigate({ to: t.to }); }}
            aria-label={t.label}
            aria-current={active ? "page" : undefined}
            className="flex-1 flex flex-col items-center gap-1 py-1.5 active:scale-95 transition"
          >
            <Icon className={`w-6 h-6 ${active ? "text-ember-text" : "text-text-tertiary"}`} strokeWidth={active ? 2.2 : 1.8} />
            <span className={`text-[10px] font-medium ${active ? "text-ember-text" : "text-text-tertiary"}`}>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
