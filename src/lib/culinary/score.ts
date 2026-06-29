// Score each cuisine template against the user's classified ingredients to find
// the strongest flavour direction(s). Deterministic weighted scoring — same set
// always yields the same ranking.

import type { Classified } from "./types";
import { CUISINES, CuisineTemplate, cuisineByName } from "./knowledge/cuisines";
import { pairingDensity } from "./knowledge/pairings";

export type ScoredDirection = {
  template: CuisineTemplate;
  score: number;        // 0..1
  signatureHits: string[];
  hasBase: boolean;
  hasProtein: boolean;
};

function clamp01(n: number) { return Math.max(0, Math.min(1, n)); }

export function scoreDirection(template: CuisineTemplate, items: Classified[]): ScoredDirection {
  const keys = new Set(items.map(i => i.key));
  const nonStaple = items.filter(i => !i.staple);

  // 1) Signature ingredients present (strongest signal).
  const signatureHits = template.signatures.filter(s => keys.has(s));
  const sigScore = clamp01(signatureHits.length / 3); // 3 signatures = full marks

  // 2) How many of the user's ingredients are "at home" in this cuisine.
  const affinityCount = nonStaple.filter(i => i.cuisines.includes(template.name)).length;
  const affinityScore = nonStaple.length ? clamp01(affinityCount / nonStaple.length) : 0;

  // 3) Structural fit: a base it likes, and a protein.
  const hasBase = items.some(i => i.roles.includes("base") && template.bases.includes(i.key));
  const hasAnyBase = items.some(i => i.roles.includes("base"));
  const hasProtein = items.some(i => i.roles.includes("protein"));
  const structureScore = (hasBase ? 0.6 : hasAnyBase ? 0.3 : 0) + (hasProtein ? 0.4 : 0);

  // 4) Known pairings already present.
  const density = clamp01(pairingDensity([...keys]) / 4);

  const score = clamp01(
    0.42 * sigScore +
    0.24 * affinityScore +
    0.22 * structureScore +
    0.12 * density,
  );

  return { template, score, signatureHits, hasBase: hasBase || hasAnyBase, hasProtein };
}

export function rankDirections(items: Classified[], preferredCuisine?: string): ScoredDirection[] {
  const ranked = CUISINES.map(t => scoreDirection(t, items))
    .sort((a, b) => b.score - a.score || a.template.name.localeCompare(b.template.name));

  if (preferredCuisine) {
    const pref = cuisineByName(preferredCuisine);
    if (pref) {
      // Force the requested cuisine to the front (still scored, for confidence).
      const idx = ranked.findIndex(r => r.template.id === pref.id);
      if (idx > 0) { const [r] = ranked.splice(idx, 1); ranked.unshift(r); }
    }
  }
  return ranked;
}
