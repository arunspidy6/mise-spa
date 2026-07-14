// App variant — lets us run two entry experiences side by side for A/B testing:
//   "classic" — the original multi-step inventory wizard.
//   "dump"    — a single "ingredients you want to cook with" screen.
//
// Resolution order (first hit wins), resolved once at startup:
//   1. URL ?v=dump | ?v=classic  → also made sticky, then stripped from the URL
//   2. localStorage (sticky per install)
//   3. default "classic"
//
// The two shareable test links are just  …/?v=classic  and  …/?v=dump .
// Every analytics event is tagged with the resolved variant (see analytics.ts),
// so any metric can be broken down by version in PostHog.

export type Variant = "classic" | "dump";

const KEY = "mise-variant";
let cached: Variant | null = null;

function isVariant(v: string | null): v is Variant {
  return v === "classic" || v === "dump";
}

export function resolveVariant(): Variant {
  if (cached) return cached;
  let v: Variant | null = null;

  // 1 — URL param. When present, persist it and strip it so the raw link isn't
  // re-shared and the param doesn't linger in the address bar.
  try {
    const url = new URL(window.location.href);
    const p = url.searchParams.get("v");
    if (isVariant(p)) {
      v = p;
      try { localStorage.setItem(KEY, v); } catch { /* storage blocked */ }
      url.searchParams.delete("v");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    }
  } catch { /* no window / bad URL */ }

  // 2 — sticky localStorage from a previous visit.
  if (!v) {
    try {
      const s = localStorage.getItem(KEY);
      if (isVariant(s)) v = s;
    } catch { /* ignore */ }
  }

  // 3 — default.
  cached = v ?? "classic";
  return cached;
}

export function getVariant(): Variant {
  return cached ?? resolveVariant();
}

export function isDump(): boolean {
  return getVariant() === "dump";
}
