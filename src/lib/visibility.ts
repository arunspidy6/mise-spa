// Tab-visibility tracking — the piece the "28-minute /onboarding" session
// exposed: a plain $pageview can't tell genuine attention from a tab left open
// in the background. We fire an explicit event whenever the tab is backgrounded
// or foregrounded, tagged with the current route and how long the page had been
// open before it went to the background.
//
// It also exposes isForeground(), so screen-level "abandoned" events can avoid
// firing when the user merely switched tabs (see the note in each screen): an
// abandon should mean "navigated away / closed while looking at it", not
// "backgrounded the tab".

import { track } from "./analytics";

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

// Current route + when it was entered. Kept up to date by the router
// subscription wired in main.tsx (notifyRouteChange), so tab events carry the
// pathname the user was actually on when they switched away.
let currentPath = typeof location !== "undefined" ? location.pathname : "/";
let pageEnteredAt = now();

// Live foreground state. Initialised from the document so a tab opened in the
// background doesn't start out mislabelled as foregrounded.
let foreground =
  typeof document === "undefined" || document.visibilityState === "visible";

let started = false;

export function isForeground(): boolean {
  return foreground;
}

// Called on every resolved navigation so pathname + page-timer track the route.
export function notifyRouteChange(pathname: string): void {
  currentPath = pathname;
  pageEnteredAt = now();
}

function onVisibilityChange(): void {
  if (document.visibilityState === "hidden") {
    foreground = false;
    track("tab_backgrounded", {
      pathname: currentPath,
      time_on_page_ms_before_background: Math.round(now() - pageEnteredAt),
    });
  } else {
    foreground = true;
    track("tab_foregrounded", { pathname: currentPath });
  }
}

// Registers the global visibilitychange listener. Safe to call once at startup;
// repeated calls are no-ops.
export function initVisibilityTracking(): void {
  if (started || typeof document === "undefined") return;
  started = true;
  document.addEventListener("visibilitychange", onVisibilityChange);
}
