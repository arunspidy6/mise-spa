// Classify normalized ingredients into culinary roles + flavour notes using the
// knowledge base. Unknown ingredients get a conservative guess so the engine
// never crashes on novel input, but they're flagged `known: false`.

import type { Classified, Role } from "./types";
import { INGREDIENTS } from "./knowledge/ingredients";
import { STAPLES, isStapleKey } from "./knowledge/staples";
import { normalizeList } from "./normalize";

const STAPLE_ROLE: Record<string, Role> = Object.fromEntries(STAPLES.map(s => [s.key, s.role]));

// Heuristic fallback roles for unknown words, by suffix/keyword.
function guessRoles(key: string): Role[] {
  if (/(oil|butter|cream|cheese|ghee)/.test(key)) return ["fat"];
  if (/(vinegar|lemon|lime|juice)/.test(key)) return ["acid"];
  if (/(chilli|chili|pepper flake|cayenne)/.test(key)) return ["heat"];
  if (/(seed|powder|spice|cumin|masala)/.test(key)) return ["spice"];
  if (/(leaf|herb|basil|mint|thyme|parsley)/.test(key)) return ["herb"];
  if (/(rice|pasta|bread|potato|noodle|grain)/.test(key)) return ["base"];
  return ["veg"]; // safest neutral default — treated as a supporting vegetable
}

export function classifyList(raw: string[]): Classified[] {
  return normalizeList(raw).map(({ key, display, known }) => {
    const entry = INGREDIENTS[key];
    if (entry) {
      return {
        input: display, key, display: entry.display,
        roles: entry.roles, notes: entry.notes ?? [],
        cuisines: entry.cuisines ?? [], staple: isStapleKey(key), known: true,
      };
    }
    if (isStapleKey(key)) {
      return { input: display, key, display, roles: [STAPLE_ROLE[key]], notes: [], cuisines: [], staple: true, known: true };
    }
    // Unknown — guess a role so the dish can still use it, but flag it.
    return { input: display, key, display, roles: guessRoles(key), notes: [], cuisines: [], staple: false, known };
  });
}

export function hasRole(items: Classified[], role: Role): boolean {
  return items.some(i => i.roles.includes(role));
}

export function byRole(items: Classified[], role: Role): Classified[] {
  return items.filter(i => i.roles.includes(role));
}

// Primary-role bucket (an ingredient counts once, under its primary role).
export function primaryRole(item: Classified): Role {
  return item.roles[0];
}
