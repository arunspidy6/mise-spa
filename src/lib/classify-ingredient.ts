// Resolve a single ingredient name to its inventory category + SAT token,
// mirroring the cascade in CustomItemInput: instant MASTER_INGREDIENTS lookup →
// localStorage cache → the classify API (cached for next time). Extracted so the
// dump-flow composer can classify several comma-separated items in one go
// without duplicating the logic.

import { API_BASE } from "./generate-recipe";
import { appHeaders } from "./appguard";
import { getDeviceId } from "./device";
import { MASTER_INGREDIENTS } from "@/routes/inventory";

export type Classified = {
  category?: string;   // proteins | carbs | vegetables | fridge | staples
  satToken?: string;   // recipe-matching key
  valid: boolean;      // false = added but we have no recipes for it yet
};

// Letters/spaces/hyphens only, Title Cased — same rules as the inventory input.
export function sanitiseIngredient(raw: string): string | null {
  if (!raw) return null;
  let clean = raw.replace(/[\u{1F000}-\u{1FFFF}]/gu, "");
  clean = clean.replace(/[^a-zA-Z\s\-']/g, "");
  clean = clean.replace(/\s+/g, " ").trim();
  if (clean.length < 2) return null;
  if (!/[a-zA-Z]/.test(clean)) return null;
  if (clean.length > 40) return null;
  return clean.replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function classifyIngredient(clean: string): Promise<Classified> {
  const lower = clean.toLowerCase();

  // ① Instant master lookup.
  const master = MASTER_INGREDIENTS[lower];
  if (master) return { category: master.category, satToken: master.satToken, valid: true };

  // ② localStorage cache from a previous classify call.
  try {
    const cached = localStorage.getItem(`mise-cls-${lower}`);
    if (cached) {
      const p = JSON.parse(cached);
      return { category: p.category, satToken: p.satToken, valid: p.isValid !== false };
    }
  } catch { /* ignore */ }

  // ③ Classify API (once per device, then cached).
  try {
    const res = await fetch(`${API_BASE}/api/classify-ingredient`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Device-ID": getDeviceId(), ...appHeaders() },
      body: JSON.stringify({ ingredient: lower }),
    });
    if (res.ok) {
      const r = await res.json();
      try { localStorage.setItem(`mise-cls-${lower}`, JSON.stringify(r)); } catch { /* ignore */ }
      return { category: r.category, satToken: r.satToken, valid: r.isValid !== false };
    }
  } catch { /* API unavailable — add without a mapping */ }

  return { valid: true };
}
