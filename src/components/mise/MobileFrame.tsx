import { ReactNode, createContext, useContext } from "react";
import { cn } from "@/lib/utils";
import { useVisualViewport } from "@/hooks/use-visual-viewport";

type MobileFrameContextValue = { keyboardOpen: boolean };

const MobileFrameContext = createContext<MobileFrameContextValue>({ keyboardOpen: false });

export function useMobileFrame() {
  return useContext(MobileFrameContext);
}

export function MobileFrame({ children, className }: { children: ReactNode; className?: string }) {
  const { height, offsetTop, keyboardOpen } = useVisualViewport();

  return (
    <MobileFrameContext.Provider value={{ keyboardOpen }}>
      {/* Desktop shell — dark backdrop; phone column capped at 430px */}
      <div
        className="app-shell fixed inset-0 flex justify-center overflow-hidden"
        aria-hidden={false}
      >
        <div
          className={cn(
            "app-phone relative w-full max-w-[430px] flex flex-col overflow-hidden bg-bg-base",
            className,
          )}
          style={{
            height: height ?? "100dvh",
            // Clear the iOS status bar / notch so top navigation doesn't collide
            // with it. 0 on web/desktop, so it's a no-op there. (Bottom is left
            // to each screen's pb-safe to avoid double-padding the home bar.)
            paddingTop: "env(safe-area-inset-top)",
            transform: offsetTop ? `translateY(${offsetTop}px)` : undefined,
          }}
        >
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

        {/* Portrait-only: on a touch phone held sideways, show a rotate prompt
            instead of a broken landscape layout (the native app is also locked
            to portrait via Info.plist). */}
        <div className="mise-landscape-block">
          <span className="text-[34px]">📱</span>
          <p className="font-display text-[20px] text-text-primary">Rotate to portrait</p>
          <p className="text-[13px] text-text-secondary">Mise is designed to be used upright.</p>
        </div>
      </div>
    </MobileFrameContext.Provider>
  );
}
