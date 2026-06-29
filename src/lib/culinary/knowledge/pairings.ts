// Classic flavour pairings + role-completeness rules.
//
// PAIRINGS is a small curated set of "these belong together" affinities by
// ingredient key. It does two jobs: it nudges scoring toward sets that already
// contain known-good pairs, and it justifies an addition ("garlic pairs with
// chilli flakes"). It is intentionally conservative — classic combinations only.

export const PAIRINGS: [string, string][] = [
  ["tomatoes", "basil"], ["tomatoes", "garlic"], ["tomatoes", "oregano"], ["tomatoes", "parmesan"],
  ["pasta", "parmesan"], ["pasta", "garlic"], ["pasta", "chilli flakes"], ["pasta", "basil"],
  ["garlic", "chilli flakes"], ["garlic", "lemon"], ["garlic", "butter"], ["garlic", "ginger"],
  ["chicken", "lemon"], ["chicken", "garlic"], ["chicken", "thyme"], ["chicken", "paprika"],
  ["beef", "onion"], ["beef", "mushrooms"], ["beef", "tomatoes"],
  ["pork", "soy sauce"], ["pork", "honey"], ["pork", "mustard"],
  ["lamb", "cumin"], ["lamb", "yoghurt"], ["lamb", "garlic"],
  ["salmon", "lemon"], ["salmon", "soy sauce"], ["salmon", "honey"],
  ["prawns", "garlic"], ["prawns", "lime"], ["prawns", "chilli flakes"],
  ["eggs", "cheddar"], ["eggs", "spinach"], ["eggs", "tomatoes"],
  ["chickpeas", "cumin"], ["chickpeas", "tomatoes"], ["chickpeas", "spinach"], ["chickpeas", "tahini"],
  ["lentils", "cumin"], ["lentils", "tomatoes"], ["lentils", "coriander"],
  ["rice", "soy sauce"], ["rice", "peas"], ["rice", "turmeric"],
  ["potatoes", "rosemary"], ["potatoes", "thyme"], ["potatoes", "garlic"], ["potatoes", "cheddar"],
  ["ginger", "soy sauce"], ["ginger", "lime"], ["lime", "coconut milk"], ["lime", "fish sauce"],
  ["coconut milk", "curry powder"], ["coconut milk", "ginger"],
  ["mushrooms", "cream"], ["mushrooms", "thyme"], ["mushrooms", "garlic"],
  ["spinach", "garlic"], ["spinach", "cream"], ["broccoli", "garlic"], ["broccoli", "soy sauce"],
  ["honey", "soy sauce"], ["honey", "mustard"], ["yoghurt", "cumin"], ["paprika", "garlic"],
];

const PAIR_INDEX = new Set(PAIRINGS.map(([a, b]) => [a, b].sort().join("|")));

export function pairScore(a: string, b: string): number {
  return PAIR_INDEX.has([a, b].sort().join("|")) ? 1 : 0;
}

// How many known pairs the set contains — a proxy for "these ingredients want
// to be cooked together".
export function pairingDensity(keys: string[]): number {
  const set = new Set(keys);
  let hits = 0;
  for (const [a, b] of PAIRINGS) if (set.has(a) && set.has(b)) hits++;
  return hits;
}

// Find a known partner for an ingredient that is also present in the set —
// used to justify why a pick belongs.
export function partnerInSet(key: string, keys: string[]): string | null {
  const set = new Set(keys);
  for (const [a, b] of PAIRINGS) {
    if (a === key && set.has(b)) return b;
    if (b === key && set.has(a)) return a;
  }
  return null;
}

// The roles a complete, balanced dish wants. Missing ones are candidates for a
// justified staple addition.
export const COMPLETENESS_ROLES = ["base", "protein", "veg", "aromatic", "fat", "acid"] as const;
