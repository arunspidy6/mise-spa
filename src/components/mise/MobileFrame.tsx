import { ReactNode } from "react";

export function MobileFrame({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen w-full bg-bg-base flex justify-center overflow-hidden">
      <div className="relative w-full max-w-[420px] h-full bg-bg-base flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
