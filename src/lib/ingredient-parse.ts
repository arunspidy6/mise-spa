// Local, zero-cost ingredient parsing for the voice-dump flow. Both functions
// run entirely on-device against the master vocabulary — no API call — so the
// dump works during the generation freeze and never spends. (The old paid
// classify path is intentionally not used here: dump prioritises speed, and an
// unknown typed word is kept as a custom item rather than sent off to classify.)

import { MASTER_INGREDIENTS } from "@/routes/inventory";

// Letters/spaces/hyphens/apostrophes only, Title-Cased — same rules as the
// manual inventory input, so a typed "chicken" and a chip "Chicken" match.
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

// Pull known ingredient names out of free speech ("I have some chicken and a
// couple of potatoes" → ["chicken", "potatoes"]). Matches the master vocabulary
// only — longest phrases first, blanking each match so sub-words don't double-
// count ("sweet potato" wins over "potato"). Filler words never match, so
// they're dropped. Returns lowercase master keys in spoken order.
export function extractKnownIngredients(text: string): string[] {
  if (!text) return [];
  let remaining = " " + text.toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim() + " ";
  const keys = Object.keys(MASTER_INGREDIENTS).sort((a, b) => b.length - a.length);
  const found: { key: string; at: number }[] = [];
  for (const key of keys) {
    const pat = " " + key + " ";
    const at = remaining.indexOf(pat);
    if (at !== -1) {
      found.push({ key, at });
      remaining = remaining.replace(pat, "  ");
    }
  }
  return found.sort((a, b) => a.at - b.at).map((f) => f.key);
}
