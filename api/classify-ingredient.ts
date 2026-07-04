import type { VercelRequest, VercelResponse } from "@vercel/node";

// App gate — inlined (not a shared _-prefixed file, which Vercel omits from the
// function bundle). Fail-open until APP_ATTEST_SECRET is set.
function appRequestAllowed(req: VercelRequest): boolean {
  // Two-key safety: arms only when explicitly enabled AND the secret is set.
  if (process.env.APP_GATE_ENABLED !== "true") return true;
  const secret = process.env.APP_ATTEST_SECRET;
  if (!secret) return true;
  const token = (req.headers["x-app-attest"] as string | undefined) ?? "";
  if (token.length !== secret.length) return false;
  let diff = 0;
  for (let i = 0; i < secret.length; i++) diff |= token.charCodeAt(i) ^ secret.charCodeAt(i);
  return diff === 0;
}

// Per-request usage/cost attribution — one structured "MISE_USAGE" line per call.
const HAIKU_PRICE = { in: 1, out: 5, cr: 0.1, cw: 1.25 }; // USD per 1M tokens
function logUsage(req: VercelRequest, usage: any): void {
  try {
    const u = usage ?? {};
    const inTok = u.input_tokens ?? 0, outTok = u.output_tokens ?? 0;
    const cr = u.cache_read_input_tokens ?? 0, cw = u.cache_creation_input_tokens ?? 0;
    const costUsd = +(((inTok * HAIKU_PRICE.in) + (outTok * HAIKU_PRICE.out) + (cr * HAIKU_PRICE.cr) + (cw * HAIKU_PRICE.cw)) / 1e6).toFixed(6);
    const rec = {
      evt: "classify",
      deviceId: (req.headers["x-device-id"] as string | undefined) || "anon",
      ip: (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0].trim() || "",
      model: "claude-haiku-4-5-20251001", inTok, outTok, cacheRead: cr, cacheWrite: cw, costUsd,
      ts: new Date().toISOString(),
    };
    console.log("MISE_USAGE " + JSON.stringify(rec));
    const sink = process.env.USAGE_SINK_URL;
    if (sink) fetch(sink, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(rec) }).catch(() => {});
  } catch { /* never break a request over logging */ }
}

// Never wildcard a paid, unauthenticated endpoint — reflect only our own origins
// so a third-party page can't spend the API budget from a user's browser.
const ALLOWED_ORIGIN: RegExp[] = [
  /^https:\/\/mise-spa(-code)?\.vercel\.app$/,
  /-aruns-projects-10c588ee\.vercel\.app$/,
  /^http:\/\/localhost(:\d+)?$/,
  /\.loca\.lt$/,
  /^capacitor:\/\/localhost$/,   // iOS Capacitor app (native WKWebView)
  /^ionic:\/\/localhost$/,       // Capacitor (alt) / Ionic origin
];
function setCors(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin as string | undefined;
  if (origin && ALLOWED_ORIGIN.some((re) => re.test(origin))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Device-ID, X-App-Attest");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // App gate — reject unauthenticated callers (no-op until APP_ATTEST_SECRET set).
  if (!appRequestAllowed(req)) return res.status(401).json({ error: "Unauthorized" });

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

  // AbortController bounds the upstream call so a stalled Anthropic request
  // fails fast (504) instead of pinning the function until Vercel's timeout.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000); // Haiku is fast
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
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
    logUsage(req, data.usage);
    const raw = data.content?.[0]?.text?.replace(/```json|```/g, "").trim();

    let result;
    try { result = JSON.parse(raw); }
    catch { return res.status(200).json({ isValid: false }); }

    return res.status(200).json(result);
  } catch (err: any) {
    if (err?.name === "AbortError") {
      console.error("Anthropic classify request timed out");
      return res.status(504).json({ error: "Classification timed out" });
    }
    console.error("Classify handler error:", err);
    return res.status(500).json({ error: "Internal error" });
  } finally {
    clearTimeout(timeout);
  }
}
