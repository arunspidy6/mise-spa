// Build a deterministic recipe blueprint from a scored flavour direction.
//
// This is where the "real culinary logic" lives: every ingredient that ends up
// in a blueprint is either something the user owns or a justified addition with
// a stated purpose (fat to carry flavour, acid for brightness, aromatic base).
// Pantry staples (salt/pepper/oil) are assumed; anything else added is flagged
// optional so the user knows they may need to grab it.

import type { Addition, Blueprint, Classified, Role } from "./types";
import type { ScoredDirection } from "./score";
import { STAPLES } from "./knowledge/staples";
import { partnerInSet } from "./knowledge/pairings";

// Owned alternatives we can suggest as substitutes for a missing item.
const SUBS: Record<string, string[]> = {
  lime: ["lemon", "vinegar"], lemon: ["lime", "vinegar"],
  cream: ["yoghurt", "milk", "coconut milk"], "coconut milk": ["cream", "yoghurt"],
  parmesan: ["cheddar"], cheddar: ["parmesan"],
  "soy sauce": ["fish sauce", "oyster sauce"], "fish sauce": ["soy sauce"],
  butter: ["olive oil"], "fresh chilli": ["chilli flakes", "chilli powder", "cayenne"],
  basil: ["parsley", "mixed herbs"], parsley: ["fresh herbs", "spring onion"],
};

const STAPLE_DISPLAYS = STAPLES.map(s => s.display);
const ownedKeys = (items: Classified[]) => items.map(i => i.key);

function firstWithRole(items: Classified[], role: Role, prefer: string[] = []): Classified | undefined {
  const pool = items.filter(i => i.roles.includes(role));
  for (const p of prefer) { const hit = pool.find(i => i.key === p); if (hit) return hit; }
  return pool[0];
}

export function buildBlueprint(
  dir: ScoredDirection,
  items: Classified[],
  opts: {
    creativity: "safe" | "creative";
    servings: number; maxPrepTime?: number; equipment?: string[];
    dietary?: string[]; skillLevel?: string;
  },
): Blueprint {
  const t = dir.template;
  const keys = ownedKeys(items);
  const picks: Blueprint["picks"] = [];
  const additions: Addition[] = [];
  const why: string[] = [];
  const used = new Set<string>();

  const take = (item?: Classified, role?: Role) => {
    if (!item || used.has(item.key)) return;
    used.add(item.key);
    picks.push({ role: role ?? item.roles[0], key: item.key, display: item.display });
  };
  const addStaple = (role: Role, display: string, reason: string) =>
    additions.push({ display, role, reason, optional: false });
  const addOptional = (role: Role, display: string, reason: string) =>
    additions.push({ display, role, reason, optional: true });

  // ── Base ────────────────────────────────────────────────────────────
  const base = firstWithRole(items, "base", t.bases);
  if (base) { take(base, "base"); why.push(`${base.display} gives the dish a ${t.name.toLowerCase()} backbone.`); }
  else {
    const b = t.bases[0];
    addOptional("base", titleCase(b), "a base to build the dish around");
  }

  // ── Protein ─────────────────────────────────────────────────────────
  const protein = firstWithRole(items, "protein");
  if (protein) {
    take(protein, "protein");
    const partner = partnerInSet(protein.key, keys);
    why.push(partner
      ? `${protein.display} pairs naturally with ${displayOf(items, partner)}.`
      : `${protein.display} is the hero protein.`);
  }

  // ── Aromatics ───────────────────────────────────────────────────────
  const aromatics = items.filter(i => i.roles.includes("aromatic"));
  if (aromatics.length) aromatics.forEach(a => take(a, "aromatic"));
  else addOptional("aromatic", "Garlic", "an aromatic foundation for depth");

  // ── Veg ─────────────────────────────────────────────────────────────
  items.filter(i => i.roles.includes("veg") && !used.has(i.key) && !i.roles.includes("aromatic"))
    .slice(0, opts.creativity === "creative" ? 3 : 2)
    .forEach(v => take(v, "veg"));

  // ── Fat (carry flavour) ─────────────────────────────────────────────
  const fat = firstWithRole(items, "fat");
  if (fat) take(fat, "fat");
  else {
    const vegan = opts.dietary?.includes("vegan") || opts.dietary?.includes("dairy-free");
    const f = !vegan && t.fats.includes("butter") ? "Butter" : "Olive oil";
    addStaple("fat", f, "fat to carry and round out the flavours");
  }

  // ── Acid (brightness) ───────────────────────────────────────────────
  const acid = firstWithRole(items, "acid");
  if (acid) take(acid, "acid");
  else {
    const a = t.acids[0] ?? "lemon";
    addOptional("acid", titleCase(a), "a hit of acidity to lift the dish");
  }

  // ── Heat (only if the set/cuisine wants it) ─────────────────────────
  const heat = firstWithRole(items, "heat");
  if (heat) take(heat, "heat");

  // ── Finisher (herb / garnish) ───────────────────────────────────────
  const finisher = items.find(i => (i.roles.includes("herb") || i.roles.includes("garnish")) && !used.has(i.key));
  if (finisher) take(finisher, "garnish");
  else if (t.finishers.length) addOptional("garnish", titleCase(t.finishers[0]), "a fresh finish to balance richness");

  // Always-present seasoning.
  addStaple("spice", "Salt", "seasoning");
  addStaple("spice", "Black pepper", "seasoning");

  // ── Substitutions for any optional/missing items ────────────────────
  const substitutions: Blueprint["substitutions"] = [];
  for (const add of additions.filter(a => a.optional)) {
    const subKey = (SUBS[add.display.toLowerCase()] ?? []).find(s => keys.includes(s));
    if (subKey) substitutions.push({ ingredient: add.display, substitute: displayOf(items, subKey) });
  }

  why.push(`Flavour direction: ${t.direction}.`);

  const optionalMissing = additions.filter(a => a.optional).map(a => a.display);
  const allowed = Array.from(new Set([
    ...picks.map(p => p.display),
    ...additions.map(a => a.display),
    ...STAPLE_DISPLAYS,
  ]));

  const score = opts.creativity === "creative"
    ? Math.max(0.35, Math.round((dir.score - 0.08) * 100) / 100)
    : Math.round(dir.score * 100) / 100;

  return {
    id: `${t.id}-${opts.creativity}`,
    cuisine: t.name,
    label: t.direction,
    creativity: opts.creativity,
    score,
    baseKey: base?.key,
    proteinKey: protein?.key,
    picks, additions, optionalMissing, substitutions, why, allowed,
    servings: opts.servings,
    maxPrepTime: opts.maxPrepTime,
    equipment: opts.equipment,
    dietary: opts.dietary,
    skillLevel: opts.skillLevel,
  };
}

function titleCase(s: string) { return s.replace(/\b\w/g, c => c.toUpperCase()); }
function displayOf(items: Classified[], key: string) {
  return items.find(i => i.key === key)?.display ?? titleCase(key);
}
