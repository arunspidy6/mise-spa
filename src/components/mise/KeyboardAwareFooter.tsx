import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useMobileFrame } from "@/components/mise/MobileFrame";

export function KeyboardAwareFooter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { keyboardOpen } = useMobileFrame();
  if (keyboardOpen) return null;

  return (
    <div
      className={cn(
        "flex-shrink-0 px-4 pb-safe pt-3 bg-bg-base border-t border-border-subtle",
        className,
      )}
    >
      {children}
    </div>
  );
}
