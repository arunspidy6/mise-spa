// Pantry staples that are assumed available to every cook. The engine may pull
// these into a blueprint to complete a dish (a fat, an acid, seasoning) without
// flagging them as "missing" — they're the things almost everyone has.
//
// Anything NOT here that the engine wants to add gets marked optional, so the
// user is told they may need to grab it.

import type { Role } from "../types";

export type Staple = { display: string; key: string; role: Role; cuisines?: string[] };

export const STAPLES: Staple[] = [
  { display: "Salt",         key: "salt",        role: "spice" },
  { display: "Black pepper", key: "black pepper", role: "spice" },
  { display: "Olive oil",    key: "olive oil",   role: "fat" },
  { display: "Vegetable oil", key: "vegetable oil", role: "fat" },
  { display: "Butter",       key: "butter",      role: "fat", cuisines: ["French", "Italian", "American"] },
  { display: "Water",        key: "water",       role: "base" },
];

const STAPLE_KEYS = new Set(STAPLES.map(s => s.key));

export function isStapleKey(key: string): boolean {
  return STAPLE_KEYS.has(key);
}

export function stapleByRole(role: Role): Staple | undefined {
  return STAPLES.find(s => s.role === role);
}
