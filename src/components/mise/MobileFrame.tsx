import { ReactNode } from "react";

export function MobileFrame({ children }: { children: ReactNode }) {
  return (
    // 100dvh = dynamic viewport height — shrinks/grows with Chrome's URL bar
    // so the layout never jumps and sticky bottom bars stay in view.
    <div className="w-full bg-bg-base flex justify-center overflow-hidden" style={{ height: "100dvh" }}>
      <div className="relative w-full max-w-[420px] h-full bg-bg-base flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
