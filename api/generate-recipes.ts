import type { VercelRequest, VercelResponse } from "@vercel/node";
import { runEngine } from "../src/lib/culinary/engine";
import { SYSTEM_PROMPT, buildUserPrompt } from "../src/lib/culinary/prompt";
import { validateBatch } from "../src/lib/culinary/guardrails";
import type { Blueprint, EngineInput, RecipeOption } from "../src/lib/culinary/types";

// ── CORS (reflect only our own origins; never wildcard a paid endpoint) ──────
const ALLOWED_ORIGIN: RegExp[] = [
  /^https:\/\/mise-spa(-code)?\.vercel\.app$/,
  /-aruns-projects-10c588ee\.vercel\.app$/,
  /^http:\/\/localhost(:\d+)?$/,
  /\.loca\.lt$/,
];
function setCors(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin as string | undefined;
  if (origin && ALLOWED_ORIGIN.some((re) => re.test(origin))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Device-ID");
}

// ── Per-IP rate limit (best-effort, resets on cold start) ────────────────────
const RATE_WINDOW_MS = 5 * 60_000;
const RATE_MAX_CALLS = 12;
const rateMap = new Map<string, number[]>();
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const prev = (rateMap.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (prev.length >= RATE_MAX_CALLS) return true;
  rateMap.set(ip, [...prev, now]);
  return false;
}

// Deterministic fallback so the API always returns at least one recipe even if
// the LLM is unavailable — a plain structured recipe straight from the blueprint.
function fallbackRecipe(bp: Blueprint): RecipeOption {
  const items = [
    ...bp.picks.map((p) => ({ item: p.display, amount: "to taste", optional: false })),
    ...bp.additions.map((a) => ({ item: a.display, amount: "to taste", optional: a.optional })),
  ];
  const roles: Record<string, string> = {};
  bp.picks.forEach((p) => (roles[p.display] = p.role));
  bp.additions.forEach((a) => (roles[a.display] = a.role));
  return {
    title: `${bp.cuisine} dish (${bp.label})`,
    cuisine: bp.cuisine,
    confidence_score: bp.score,
    flavor_profile: bp.label,
    ingredient_roles: roles,
    ingredients_with_amounts: items,
    instructions: [
      { step: 1, text: "Prep the ingredients: dice aromatics, cut the protein and veg into even pieces.", timerMinutes: null },
      { step: 2, text: "Cook the base and the protein through to a safe doneness, then combine with the aromatics and seasoning.", timerMinutes: null },
      { step: 3, text: "Finish with the acid and any garnish, taste, and adjust seasoning.", timerMinutes: null },
    ],
    substitutions: bp.substitutions,
    optional_missing_items: bp.optionalMissing,
    why_this_works: bp.why.join(" "),
    warnings_or_limitations: ["Outline only — the detailed method couldn't be generated, so quantities and times are approximate."],
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) return res.status(429).json({ error: "Too many requests — please wait a minute." });

  const body = (req.body ?? {}) as EngineInput;
  if (!Array.isArray(body.ingredients) || body.ingredients.length === 0) {
    return res.status(400).json({ error: "Provide an ingredients array." });
  }

  // ── Deterministic engine: ingredients → 1–2 blueprints ──
  const engine = runEngine(body);
  if (engine.blueprints.length === 0) {
    return res.status(200).json({ recipes: [], note: engine.note ?? "No recipe could be built from these ingredients." });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // No LLM configured — still return structured fallbacks so the product works.
    return res.status(200).json({
      recipes: engine.blueprints.map(fallbackRecipe),
      note: engine.note,
    });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "prompt-caching-2024-07-31",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 3500,
        temperature: 0.3, // low for product determinism
        system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: buildUserPrompt(engine.blueprints, body) }],
      }),
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      return res.status(200).json({ recipes: engine.blueprints.map(fallbackRecipe), note: engine.note });
    }

    const data = await response.json();
    const rawText = data.content?.[0]?.text?.replace(/```json|```/g, "").trim();
    let parsed: any;
    try { parsed = JSON.parse(rawText); } catch { parsed = null; }

    const recipes = validateBatch(parsed?.recipes ?? [], engine.blueprints);
    // Backfill any blueprint the model failed to produce with a deterministic outline.
    if (recipes.length < engine.blueprints.length) {
      for (let i = recipes.length; i < engine.blueprints.length; i++) recipes.push(fallbackRecipe(engine.blueprints[i]));
    }

    return res.status(200).json({ recipes, note: engine.note });
  } catch (err: any) {
    if (err?.name === "AbortError") return res.status(504).json({ error: "Generation timed out — please try again." });
    console.error("generate-recipes error:", err);
    // Never hard-fail the product — fall back to structured outlines.
    return res.status(200).json({ recipes: engine.blueprints.map(fallbackRecipe), note: engine.note });
  }
}
