// A stopwatch that only counts foreground time. Used for "time_on_screen_ms" on
// the inventory/session/cook flows so a screen left open in a backgrounded tab
// doesn't inflate the number — the whole point of the visibility work is that
// dropoff and time-on-screen metrics reflect real attention, not idle tabs.
//
// Start one when a screen mounts, read getActiveMs() when it completes or is
// abandoned, and dispose() to detach the listener.

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

export interface ActiveTimer {
  getActiveMs(): number;
  dispose(): void;
}

export function startActiveTimer(): ActiveTimer {
  let activeMs = 0;
  // Time the current foreground stretch started, or null while backgrounded.
  let lastResume: number | null =
    typeof document === "undefined" || document.visibilityState === "visible"
      ? now()
      : null;

  const onVis = () => {
    if (document.visibilityState === "hidden") {
      if (lastResume != null) {
        activeMs += now() - lastResume;
        lastResume = null;
      }
    } else if (lastResume == null) {
      lastResume = now();
    }
  };

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVis);
  }

  return {
    getActiveMs() {
      let ms = activeMs;
      if (lastResume != null) ms += now() - lastResume;
      return Math.round(ms);
    },
    dispose() {
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVis);
      }
    },
  };
}
