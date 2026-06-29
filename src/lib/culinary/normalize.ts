// Ingredient normalization: free-text user strings → canonical knowledge keys.
//
// Resolves aliases ("scallion" → spring onion, "chicken thighs" → chicken),
// strips noise, and falls back to a longest-token match so "garlic cloves" or
// "fresh basil" still resolve. Deterministic and case-insensitive.

import { INGREDIENTS } from "./knowledge/ingredients";
import { STAPLES } from "./knowledge/staples";

export type Normalized = { key: string; display: string; known: boolean };

// Build alias → canonical-key index once.
const ALIAS_INDEX: Record<string, string> = (() => {
  const idx: Record<string, string> = {};
  const add = (alias: string, key: string) => { idx[alias.toLowerCase().trim()] = key; };
  for (const [key, entry] of Object.entries(INGREDIENTS)) {
    add(key, key);
    add(entry.display, key);
    (entry.aliases ?? []).forEach(a => add(a, key));
  }
  for (const s of STAPLES) { add(s.key, s.key); add(s.display, s.key); }
  return idx;
})();

// Knowledge keys sorted longest-first so "sweet potato" beats "potato".
const KEYS_BY_LENGTH = Object.keys(ALIAS_INDEX).sort((a, b) => b.length - a.length);

const DISPLAY: Record<string, string> = (() => {
  const d: Record<string, string> = {};
  for (const [key, entry] of Object.entries(INGREDIENTS)) d[key] = entry.display;
  for (const s of STAPLES) d[s.key] = d[s.key] ?? s.display;
  return d;
})();

function clean(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")          // drop parentheticals
    .replace(/[^a-z\s\-/']/g, " ")
    .replace(/\b(\d+|fresh|dried|ground|chopped|sliced|diced|minced|canned|tinned|cooked|raw|large|small|medium|of|a|some|few)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const titleCase = (s: string) => s.replace(/\b\w/g, c => c.toUpperCase());

export function normalizeOne(raw: string): Normalized {
  const c = clean(raw);
  if (!c) return { key: raw.toLowerCase().trim(), display: titleCase(raw.trim()), known: false };

  // 1) exact alias / key / display match
  if (ALIAS_INDEX[c]) {
    const key = ALIAS_INDEX[c];
    return { key, display: DISPLAY[key] ?? titleCase(key), known: true };
  }

  // 2) longest known alias contained in the string ("garlic cloves" → garlic)
  for (const alias of KEYS_BY_LENGTH) {
    if (alias.length < 3) continue;
    const re = new RegExp(`\\b${alias.replace(/[/]/g, "\\/")}\\b`);
    if (re.test(c)) {
      const key = ALIAS_INDEX[alias];
      return { key, display: DISPLAY[key] ?? titleCase(key), known: true };
    }
  }

  // 3) unknown — keep it, but mark so the engine can treat it cautiously
  return { key: c, display: titleCase(c), known: false };
}

export function normalizeList(raw: string[]): Normalized[] {
  const seen = new Set<string>();
  const out: Normalized[] = [];
  for (const r of raw) {
    if (!r || !r.trim()) continue;
    const n = normalizeOne(r);
    if (seen.has(n.key)) continue;   // de-dupe (chicken breast + chicken thighs → chicken once)
    seen.add(n.key);
    out.push(n);
  }
  return out;
}
