import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("FATAL: ANTHROPIC_API_KEY env var is not set in Vercel Environment Variables");
    return res.status(500).json({ error: "API key not configured" });
  }

  const { ingredient } = req.body ?? {};
  if (!ingredient || typeof ingredient !== "string") {
    return res.status(400).json({ error: "Missing ingredient" });
  }

  // Sanitise on server side too — never trust client input
  const clean = ingredient.replace(/[^a-zA-Z\s\-']/g, "").trim().slice(0, 60);
  if (clean.length < 2) {
    return res.status(200).json({ isValid: false });
  }

  // Keep the prompt SHORT to minimise token usage
  const prompt = `Classify this food ingredient for a cooking app: "${clean}"

SAT tokens available:
PROTEINS: chicken breast, chicken thighs, chicken legs, chicken wings, chicken mince, beef mince, steak, pork mince, pork chops, pork belly, sausages, bacon, lamb mince, lamb chops, lamb, salmon, white fish, oily fish, smoked salmon, prawns, canned tuna, eggs, tofu, chickpeas, lentils
CARBS: pasta, rice, noodles, potatoes, bread, tortillas, couscous
VEGETABLES: tomatoes, peppers, spinach, broccoli, mushrooms, courgette, carrots, sweet potato, onion
FRIDGE: milk, cream, cheddar, parmesan, yoghurt, butter, lemons, coconut milk, honey, fish sauce
STAPLES: garlic, olive oil, salt, pepper, flour, sugar, tomato paste, stock cubes, cumin, paprika, ginger, soy sauce

Return ONLY JSON:
{"isValid":true/false,"displayLabel":"Name","category":"proteins|carbs|vegetables|fridge|staples","satToken":"token or null","confidence":"high|medium|low"}

If not a real food ingredient set isValid:false. No explanation.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 150,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Anthropic classify error:", response.status, err);
      return res.status(502).json({ error: "Classification failed" });
    }

    const data = await response.json();
    const raw = data.content?.[0]?.text?.replace(/```json|```/g, "").trim();

    let result;
    try { result = JSON.parse(raw); }
    catch { return res.status(200).json({ isValid: false }); }

    return res.status(200).json(result);
  } catch (err) {
    console.error("Classify handler error:", err);
    return res.status(500).json({ error: "Internal error" });
  }
}
