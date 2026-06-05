import { ReactNode } from "react";

export function MobileFrame({ children }: { children: ReactNode }) {
  return (
    // 100dvh = dynamic viewport height — shrinks/grows with Chrome's URL bar
    // so the layout never jumps and sticky bottom bars stay in view.
    <div className="w-full bg-bg-base flex justify-center overflow-hidden" style={{ height: "100dvh" }}>
      <div className="relative w-full max-w-[420px] h-full flex flex-col overflow-hidden bg-bg-base">
        {/* Dotted grid texture — isolated background layer pinned at z-0, never on top of UI */}
        <div
          aria-hidden="true"
          className="absolute inset-0 z-0 pointer-events-none select-none"
          style={{
            backgroundImage: "radial-gradient(var(--tile-color) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        {/* All app content sits in its own stacking layer above the texture */}
        <div className="relative z-10 flex flex-col h-full min-h-0">
          {children}
        </div>
      </div>
    </div>
  );
}
