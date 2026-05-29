import type { VercelRequest, VercelResponse } from "@vercel/node";

// ── IP Rate Limiter ────────────────────────────────────────────────────────
// Best-effort on serverless (each warm instance enforces independently).
// Still stops a single browser/script from hammering the endpoint.
const RATE_WINDOW_MS = 2 * 60_000;  // 2-minute sliding window
const RATE_MAX_CALLS = 6;            // max 6 AI calls per IP per 2 minutes

const rateMap = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const prev = (rateMap.get(ip) ?? []).filter(t => now - t < RATE_WINDOW_MS);
  if (prev.length >= RATE_MAX_CALLS) return true;
  rateMap.set(ip, [...prev, now]);
  // Prune dead entries ~1% of requests to avoid unbounded growth
  if (Math.random() < 0.01) {
    for (const [k, v] of rateMap) {
      if (v.every(t => now - t >= RATE_WINDOW_MS)) rateMap.delete(k);
    }
  }
  return false;
}

// ── Static system prompt (cached by Anthropic after first call) ────────────
// Must be sent identically every request for the cache to hit.
// Anthropic caches prefixes ≥ 1024 tokens; this block intentionally covers
// all the stable instructions so only the dynamic user message counts fresh.
const SYSTEM_PROMPT = `You are Mise — a culinary AI that generates practical, well-structured recipes for home cooks.

ABSOLUTE RULE: Use ONLY the ingredients explicitly listed by the user. Never add an ingredient not on their list, even a "basic" one like salt or oil unless it appears in their AVAILABLE list.

STEP WRITING STANDARDS:
- Begin every step with an action verb: Slice, Heat, Add, Toss, Sear, Deglaze, Rest.
- Include specific quantities in every step instruction (e.g. "3 tbsp soy sauce", "200 g pasta") — never say "some" or "a bit".
- Include at least one sensory cue per step (colour, sound, smell, texture) so the cook can verify progress without a thermometer.
- Any step that involves waiting — boiling, simmering, roasting, resting, marinating — MUST have a timerMinutes integer (not null).
- Steps that take no meaningful waiting time use timerMinutes: null.
- Combine related micro-actions into a single step. Do not fragment "add garlic" and "stir garlic" into two steps.
- Give exit criteria where precision matters: "until the sauce coats the back of a spoon", "until the skin is deep mahogany and releases cleanly".
- Write for a competent home cook. Assume they know how to hold a knife and operate a hob. Skip basic tutorials.

DIFFICULTY SCALE:
1 = one pan, minimal timing, low skill floor — anyone can cook this.
2 = requires some timing judgment, moderate skill, maybe two pans.
3 = technically demanding — precise temperature, complex multi-stage technique.

DISH NAMING:
- Name must be specific and appetising.
- Reference the hero ingredient or main protein in the name.
- Avoid generic names like "Chicken Stir Fry" — prefer "Soy-glazed chicken thighs with garlic rice".

DESCRIPTION:
- One sentence, maximum 15 words.
- Must name the hero ingredient.
- Should evoke texture or flavour: "Crisp-skinned salmon lacquered in a sweet soy glaze."

IMAGE URL:
- Use the pollinations.ai format. URL-encode the dish name for the prompt segment.
- Always append: ?width=800&height=500&nologo=true&seed=<random 2-digit number>

RETURN FORMAT — valid JSON only. No markdown fences. No explanation before or after.
{
  "name": "Specific dish name referencing main ingredient",
  "cuisine": "single cuisine label",
  "description": "One sentence max 15 words naming hero ingredient",
  "time_minutes": <active + passive time combined as integer>,
  "difficulty": <1 | 2 | 3>,
  "servings": <integer>,
  "image": "https://image.pollinations.ai/prompt/<url-encoded-dish>%20professional%20food%20photo%20overhead?width=800&height=500&nologo=true&seed=<nn>",
  "matchLabel": "Made from your kitchen",
  "matchPercent": 1,
  "requiredSwaps": [],
  "optionalMissing": [],
  "sparseFallback": false,
  "ingredients": [
    { "name": "<ingredient>", "quantity": "<specific amount + unit>", "inInventory": true }
  ],
  "steps": [
    { "number": 1, "instruction": "<Action verb> + <quantities> + <sensory cue>.", "timerMinutes": null },
    { "number": 2, "instruction": "<Action verb> + <quantities> + <sensory cue>.", "timerMinutes": 5 }
  ]
}

SELF-CHECK before returning:
[ ] Every ingredient in the ingredients array appears in the user's AVAILABLE list.
[ ] Every waiting step has timerMinutes as an integer, not null.
[ ] No step uses vague quantities ("some", "a bit", "to taste" without a default amount).
[ ] Dish name is specific and appetising.
[ ] Description is ≤ 15 words and names the hero ingredient.
[ ] JSON is valid and complete — no trailing commas, no missing closing brackets.`;

// ── Handler ────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // ── Rate limit ──────────────────────────────────────────────────────────
  const ip =
    (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0].trim() ??
    req.socket?.remoteAddress ??
    "unknown";

  if (isRateLimited(ip)) {
    return res.status(429).json({
      error: "Too many requests — please wait a moment before trying again.",
    });
  }

  // ── Auth & validation ───────────────────────────────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API key not configured" });

  const { inventory, session } = req.body ?? {};
  if (!inventory) return res.status(400).json({ error: "Missing inventory" });

  const ingredients = [
    ...(inventory.proteins   || []),
    ...(inventory.carbs      || []),
    ...(inventory.vegetables || []),
    ...(inventory.staples    || []),
    ...(inventory.fridge     || []),
  ].filter(Boolean);

  if (ingredients.length === 0) return res.status(400).json({ error: "No ingredients" });

  // ── Dynamic user message (changes per request — not cached) ────────────
  const userMessage =
    `Generate a recipe using ONLY the ingredients below.

AVAILABLE: ${ingredients.join(", ")}
APPLIANCES: ${(inventory.appliances || ["Hob/Stove"]).join(", ")}
TIME: max ${session?.timeMinutes ?? 30} minutes
SERVINGS: ${session?.servings ?? 2}
${session?.cuisine ? `CUISINE: ${session.cuisine}` : "CUISINE: your choice — be creative, avoid repeating the same cuisine twice"}`;

  // ── Anthropic call with prompt caching ─────────────────────────────────
  // The system block is sent with cache_control so Anthropic caches it after
  // the first request. Subsequent calls with the same system text pay only for
  // the cache read (10% of normal input cost) instead of full token ingestion.
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "prompt-caching-2024-07-31",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2500,
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Anthropic error:", response.status, err);
      return res.status(502).json({ error: "Generation failed" });
    }

    const data = await response.json();

    // Log cache usage in dev so you can verify caching is working
    if (process.env.NODE_ENV !== "production") {
      const usage = data.usage ?? {};
      console.log("Token usage:", {
        input:        usage.input_tokens,
        output:       usage.output_tokens,
        cacheWrite:   usage.cache_creation_input_tokens,
        cacheRead:    usage.cache_read_input_tokens,
      });
    }

    const raw = data.content?.[0]?.text?.replace(/```json|```/g, "").trim();

    let recipe;
    try { recipe = JSON.parse(raw); }
    catch { return res.status(502).json({ error: "Invalid JSON from model" }); }

    if (!recipe.name || !recipe.steps) {
      return res.status(502).json({ error: "Invalid recipe shape" });
    }

    return res.status(200).json(recipe);
  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({ error: "Internal error" });
  }
}
