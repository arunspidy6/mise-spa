import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API key not configured" });

  const { inventory, session } = req.body ?? {};
  if (!inventory) return res.status(400).json({ error: "Missing inventory" });

  const ingredients = [
    ...(inventory.proteins || []),
    ...(inventory.carbs || []),
    ...(inventory.vegetables || []),
    ...(inventory.staples || []),
    ...(inventory.fridge || []),
  ].filter(Boolean);

  if (ingredients.length === 0) return res.status(400).json({ error: "No ingredients" });

  const prompt = `You are a recipe generator for Mise, a cooking app for home cooks.

STRICT RULE: Use ONLY ingredients from this list. Do not add anything not listed here.
AVAILABLE INGREDIENTS: ${ingredients.join(", ")}
APPLIANCES: ${(inventory.appliances || ["Hob/Stove"]).join(", ")}
TIME: max ${session?.timeMinutes ?? 30} minutes
SERVINGS: ${session?.servings ?? 2}
${session?.cuisine ? `CUISINE: ${session.cuisine}` : "CUISINE: your choice — be creative and diverse"}

RULES:
- Every ingredient in the recipe MUST come from the AVAILABLE INGREDIENTS list
- Include specific quantities in every step instruction, not just the ingredient list
- Steps must have sensory cues: colour, smell, sound, texture
- Any step involving waiting MUST have a timerMinutes number
- Name the dish specifically referencing the main protein or ingredient
- Write for a competent home cook — a guide not a tutorial

Return ONLY valid JSON, no explanation, no markdown:
{
  "name": "Specific dish name",
  "cuisine": "single cuisine",
  "description": "One sentence max 15 words referencing main ingredient",
  "time_minutes": number,
  "difficulty": 1,
  "servings": number,
  "image": "https://image.pollinations.ai/prompt/[url-encoded-dish]%20professional%20food%20photo?width=800&height=500&nologo=true&seed=42",
  "matchLabel": "Made from your kitchen",
  "matchPercent": 1,
  "requiredSwaps": [],
  "optionalMissing": [],
  "sparseFallback": false,
  "ingredients": [
    { "name": "ingredient name", "quantity": "amount with unit", "inInventory": true }
  ],
  "steps": [
    { "number": 1, "instruction": "Step text with quantities and sensory cues.", "timerMinutes": null }
  ]
}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Anthropic error:", response.status, err);
      return res.status(502).json({ error: "Generation failed" });
    }

    const data = await response.json();
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
