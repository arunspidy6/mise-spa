import { useEffect, useRef } from "react";

// iOS-style "swipe from the left edge to go back". Fires `onBack` on a brisk,
// mostly-horizontal, left-to-right drag that starts near the screen's left
// edge. Edge-only + horizontal-dominance keeps it from hijacking vertical
// scrolls or horizontal chip rows. Listeners live only while `enabled`.
export function useSwipeBack(onBack: () => void, enabled = true) {
  const start = useRef<{ x: number; y: number; t: number } | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) { start.current = null; return; }
      const t = e.touches[0];
      // Only arm the gesture when it begins near the left edge.
      start.current = t.clientX <= 32 ? { x: t.clientX, y: t.clientY, t: Date.now() } : null;
    };

    const onEnd = (e: TouchEvent) => {
      const s = start.current;
      start.current = null;
      if (!s) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - s.x;
      const dy = t.clientY - s.y;
      const dt = Date.now() - s.t;
      // Rightward, horizontal-dominant, brisk.
      if (dx > 60 && Math.abs(dy) < 45 && Math.abs(dx) > Math.abs(dy) * 1.8 && dt < 700) {
        onBack();
      }
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchend", onEnd);
    };
  }, [onBack, enabled]);
}
