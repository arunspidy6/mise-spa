import type { VercelRequest, VercelResponse } from "@vercel/node";

// App gate — reject unauthenticated callers. Inlined (not a shared _-prefixed
// file, which Vercel omits from the function bundle) so it always ships.
// Fail-open until APP_ATTEST_SECRET is set, so the live app is never broken.
function appRequestAllowed(req: VercelRequest): boolean {
  // Two-key safety: the gate only arms when BOTH the secret exists AND it's
  // explicitly enabled — so a stray APP_ATTEST_SECRET can't silently 401 all
  // traffic (that footgun already bit us once).
  if (process.env.APP_GATE_ENABLED !== "true") return true;
  const secret = process.env.APP_ATTEST_SECRET;
  if (!secret) return true;
  const token = (req.headers["x-app-attest"] as string | undefined) ?? "";
  if (token.length !== secret.length) return false;
  let diff = 0;
  for (let i = 0; i < secret.length; i++) diff |= token.charCodeAt(i) ^ secret.charCodeAt(i);
  return diff === 0;
}

// ── Usage attribution ─────────────────────────────────────────────────────────
// Per-1M-token USD rates (input / output / cache-read / cache-write).
const PRICING: Record<string, { in: number; out: number; cr: number; cw: number }> = {
  "claude-sonnet-4-6": { in: 3, out: 15, cr: 0.3, cw: 3.75 },
  "claude-haiku-4-5-20251001": { in: 1, out: 5, cr: 0.1, cw: 1.25 },
};

// Emit one structured line per paid call so usage/cost can be attributed to a
// device (there are no accounts). Grep "MISE_USAGE" in Vercel logs, drain the
// logs to analytics, or set USAGE_SINK_URL to POST each event to a collector
// (e.g. PostHog) for retention analysis keyed on deviceId.
function logUsage(req: VercelRequest, evt: string, model: string, usage: any): void {
  try {
    const u = usage ?? {};
    const inTok = u.input_tokens ?? 0, outTok = u.output_tokens ?? 0;
    const cr = u.cache_read_input_tokens ?? 0, cw = u.cache_creation_input_tokens ?? 0;
    const p = PRICING[model] ?? { in: 0, out: 0, cr: 0, cw: 0 };
    const costUsd = +(((inTok * p.in) + (outTok * p.out) + (cr * p.cr) + (cw * p.cw)) / 1e6).toFixed(6);
    const rec = {
      evt,
      deviceId: (req.headers["x-device-id"] as string | undefined) || "anon",
      ip: (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0].trim() || "",
      model, inTok, outTok, cacheRead: cr, cacheWrite: cw, costUsd,
      ts: new Date().toISOString(),
    };
    console.log("MISE_USAGE " + JSON.stringify(rec));
    const sink = process.env.USAGE_SINK_URL;
    if (sink) {
      // Fire-and-forget — never let analytics delivery affect the response.
      fetch(sink, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(rec) }).catch(() => {});
    }
  } catch { /* logging must never break a request */ }
}

// ── Cost guards ──────────────────────────────────────────────────────────────
// IMPORTANT: in-memory guards are best-effort only — each warm serverless
// instance enforces them independently and they reset on cold start. They stop
// casual spamming, but the ONLY hard guarantee against a runaway bill is a
// monthly spend limit set in the Anthropic Console (Settings → Limits).

// Per-IP sliding window — stops one browser/script hammering the endpoint.
const RATE_WINDOW_MS = 5 * 60_000;  // 5-minute window
const RATE_MAX_CALLS = 12;           // max 12 AI calls per IP per 5 minutes

const rateMap = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const prev = (rateMap.get(ip) ?? []).filter(t => now - t < RATE_WINDOW_MS);
  if (prev.length >= RATE_MAX_CALLS) return true;
  rateMap.set(ip, [...prev, now]);
  if (Math.random() < 0.01) {
    for (const [k, v] of rateMap) {
      if (v.every(t => now - t >= RATE_WINDOW_MS)) rateMap.delete(k);
    }
  }
  return false;
}

// Global circuit breaker — caps total generations per warm instance per hour,
// so even a distributed spam burst can't loop one instance into a huge bill.
const GLOBAL_WINDOW_MS = 60 * 60_000;   // 1 hour
const GLOBAL_MAX_CALLS = 200;           // max 200 generations / instance / hour
let globalWindowStart = Date.now();
let globalCount = 0;

function globalCapReached(): boolean {
  const now = Date.now();
  if (now - globalWindowStart > GLOBAL_WINDOW_MS) { globalWindowStart = now; globalCount = 0; }
  if (globalCount >= GLOBAL_MAX_CALLS) return true;
  globalCount++;
  return false;
}

// ── Static system prompt (cached by Anthropic after first call) ────────────
// Must be sent identically every request for the cache to hit.
// Anthropic caches prefixes ≥ 1024 tokens; this block intentionally covers
// all the stable instructions so only the dynamic user message counts fresh.
const SYSTEM_PROMPT = `You are Mise — a culinary AI that generates practical, well-structured recipes for home cooks.

ABSOLUTE RULE: Use ONLY the ingredients explicitly listed by the user. Never add an ingredient not on their list, even a "basic" one like salt or oil unless it appears in their AVAILABLE list.

FLAVOUR PAIRING & DISH COHERENCE (critical — a coherent dish beats using everything):
- Having an ingredient does NOT mean it belongs in this dish. You do NOT have to use every available ingredient. Build one coherent dish around a clear flavour direction, then pull in only the ingredients that genuinely belong.
- OMIT any ingredient that would clash. It is always better to leave an ingredient out than to force a combination a good cook would never serve. Never add something solely because it is in the AVAILABLE list.
- Respect cuisine and flavour-profile coherence: ingredients should share a culinary tradition or a known affinity (e.g. fenugreek + cumin + chickpea reads Indian; basil + garlic + tomato reads Italian). Do not mix assertive signatures from clashing cuisines in one dish.
- Whole spices and seeds (fenugreek, mustard, cumin, fennel, coriander seed, cardamom) are NOT a topping. They must be bloomed in hot oil or toasted and, if they would otherwise be eaten whole and bitter (fenugreek especially), used in small measured amounts, toasted, and ideally ground — never scattered raw through a dish like pasta where every bite turns bitter.
- Match each ingredient to a sensible role and technique: a seed/spice seasons, a protein is the hero, an acid brightens, a fat carries flavour. Don't assign an ingredient a role it can't play.
- If the only way to use an ingredient is to wedge it somewhere it doesn't belong, leave it out and note nothing — just build the better dish. Quietly dropping a poor-fit ingredient is correct; it appears in optionalMissing only if the user would reasonably expect it.
- Sanity test before finalising: would a competent cook actually serve this combination? If not, change the dish — adjust the flavour direction or drop the offending ingredient.

STRUCTURAL SKELETONS — ANCHORED-BUT-ADAPTIVE (critical — this is the single source of truth for structure; edit the skeletons here):
Every recipe MUST be built on ONE of the technique skeletons below.
- Pick the skeleton whose "Requires" best matches the user's AVAILABLE ingredients and appliances.
- Follow its STRUCTURE (step order) and RATIOS (scale linearly to the requested SERVINGS), and respect its FAILURE NOTES.
- Do NOT invent a new structure, reorder its steps, or change its ratios. The skeleton fixes the METHOD.
- ADAPT WITHIN it: you choose which of the user's ingredients fill each role (protein, aromatics, acid, carb) and the cuisine/flavour direction. The skeleton does not fix the ingredients.
- If the kitchen fits no skeleton cleanly, use the CLOSEST one and adapt; only return {"error":"no_recipe"} when no skeleton can yield a sensible dish.
- HONESTY: every skeleton is DRAFT (unverified). NEVER imply the dish is tested, proven, verified, or reliably-good in the name, description, tasteNote, or any why-reason. Describe it plainly; do not vouch for it.
Ratios are per serving unless stated.
SK-01 Stir-fry — Requires: high-heat pan, oil, protein or firm veg, aromatics (garlic/ginger/chilli), salty liquid (soy/fish sauce). Ratios/serving: protein 150 g · veg 150–200 g · aromatics 1 tbsp minced · sauce 2 salty : 1 sweet : 1 acid (~3 tbsp) · optional 1 tsp cornflour in 2 tbsp water. Structure: prep everything first → oil smoking-hot → sear protein in a single layer, remove → hard-fry veg 2–3 min → aromatics 30 s → sauce in, protein back, toss 1 min → serve over carb. Failure: crowded pan steams (batch the protein); aromatics burn past 45 s.
SK-02 Fried rice — Requires: cooked (ideally day-old) rice, egg or protein, soy, oil, aromatics. Ratios/serving: cooked rice 200 g · egg 1 · protein 80–100 g (optional) · soy 1 tbsp · oil 1 tbsp. Structure: scramble egg, remove → protein/veg → aromatics 30 s → rice broken up, high heat 2–3 min undisturbed to crisp → soy round the pan edge → egg back, toss. Failure: warm rice clumps (spread to steam off 10 min); soy poured straight on rice = soggy patches.
SK-03 Tomato-base pasta — Requires: pasta, tinned tomatoes/passata/paste, oil, garlic or onion. Ratios/serving: pasta 90 g dry · tomato 200 g tinned (or 2 tbsp paste + 100 ml pasta water) · garlic 2 cloves · oil 1½ tbsp. Structure: pasta into salted boiling water (10 g salt/L) → in parallel: garlic in oil low 1–2 min, tomato in, simmer 10 min → pasta 1 min under package time into the sauce with a ladle of pasta water → 1 min together. Failure: sauce needs its own salt; finish pasta IN the sauce to bind — draining fully and pouring on top is the miss.
SK-04 Curry (weeknight, one-pot) — Requires: onion, garlic/ginger, ground spices or curry powder, protein or chickpeas, tinned tomato or coconut milk. Ratios/serving: onion ½ · spice 1–1½ tbsp · protein 150 g or chickpeas 120 g drained · liquid 150–200 ml. Structure: onion in oil medium 6–8 min to golden → garlic/ginger 1 min → spices 30–60 s until fragrant (not scorched) → tomato/coconut, simmer 5 min → protein in, simmer to safe doneness (chicken pieces 12–15 min) → salt + acid (lemon/vinegar ½ tsp) at the end. Failure: under-cooked onion = raw harshness nothing fixes; spices burn in a dry pan — have liquid ready.
SK-05 Traybake — Requires: oven, tray, protein and/or hardy veg, oil. Ratios/serving: protein 150–180 g · veg 200 g cut even · oil 1 tbsp · salt ½ tsp. Structure: oven 200 °C → hardy veg (potato, carrot, onion) first 15 min → protein + quick veg added → 20–25 min to doneness (chicken thigh 74 °C / juices clear) → rest 5 min. Failure: uneven sizes cook unevenly; a crowded tray steams — leave gaps.
SK-06 Pan-sear + pan sauce — Requires: pan, a searable protein (steak/chicken breast/pork chop/firm fish), butter or oil, a liquid (stock, water+cube, wine, or lemon+water). Ratios/serving: protein 160–200 g · fat 1 tbsp · sauce liquid 100 ml · finishing butter 1 tsp. Structure: protein dried + salted → hot pan, sear undisturbed 3–6 min/side to deep colour and safe doneness (chicken 74 °C, pork 63 °C + rest, fish opaque) → protein rests → aromatics 30 s in the pan → liquid in, scrape the browned bits, reduce by half → butter off heat → sauce over rested protein. Failure: wet protein won't brown; moving it early tears the crust; skipping the rest bleeds the juices.
SK-07 Soup (blended or brothy) — Requires: pot, onion, a bulk veg or lentils, liquid (stock or water+cube). Ratios/serving: onion ½ · bulk veg 200 g or red lentils 60 g dry · liquid 350 ml. Structure: onion softened 5 min → garlic/spices 1 min → veg + liquid → simmer to tender (lentils 20 min, root veg 15–20) → blend or leave brothy → season + acid at the end. Failure: under-seasoning is the default fail — salt in stages; blended soups need more salt than you think.
SK-08 Frittata / omelette-bake — Requires: eggs, oven-safe or lidded pan, cooked or quick veg, optional cheese. Ratios/serving: eggs 3 · dairy 1 tbsp (optional) · fillings 100 g pre-cooked/quick · cheese 20 g. Structure: fillings sautéed in the pan → beaten seasoned eggs over, medium-low → edges set, middle wobbly → lid on 3–4 min or grill 2 min to just-set. Failure: high heat = rubber; watery veg (tomato, courgette) must be cooked down first or the base weeps.
SK-09 Noodle bowl (soupy or tossed) — Requires: noodles, a salty base (soy/miso/stock cube), aromatics; protein optional. Ratios/serving: noodles 80–90 g dry · broth 350 ml (soupy) or sauce 2–3 tbsp (tossed) · aromatics 1 tbsp. Structure: noodles cooked per packet, drained, tossed with ½ tsp oil → base built separately (aromatics bloomed, liquid in, 5 min) → combine at the end, toppings on. Failure: noodles sitting in hot broth keep cooking — combine at serving, not before.
SK-10 Chilli / quick braise — Requires: pot, mince or diced protein or beans, onion, tinned tomatoes, spices. Ratios/serving: mince 125 g or beans 120 g drained · onion ½ · tomato 200 g tinned · spice 1 tbsp. Structure: onion 5 min → mince browned properly (let it sit, don't stir constantly) → spices 1 min → tomatoes + a splash of water → simmer uncovered 25–40 min, stirring occasionally → season late, acid at the end. Failure: a 15-minute chilli tastes like its ingredients, not chilli — the simmer IS the recipe; over-stirred grey mince never develops flavour.
SK-11 Grain bowl (warm, assembled) — Requires: a grain (rice/couscous/bulgur), one roasted or sautéed element, a dressing (oil + acid + salt). Ratios/serving: grain 75 g dry · veg/protein 200 g total · dressing 1½ tbsp (2 oil : 1 acid). Structure: grain cooked per type → elements roasted/sautéed in parallel → dressing whisked → assembled warm, dressing over everything. Failure: undressed grain is the whole failure mode — season the grain itself, not just the toppings.
SK-12 Risotto-method (rice or orzo) — Requires: risotto rice or orzo, hot stock (or water+cubes), onion, butter or oil; patience. Ratios/serving: rice 80 g · hot stock 400 ml · onion ¼ fine · butter 1 tbsp + 1 tsp to finish. Structure: onion soft 4 min → rice toasted 1–2 min → hot stock a ladle at a time, stirring, next ladle when absorbed → 18–20 min to al dente → off heat, butter/cheese beaten in, 2 min lid-on rest. Failure: cold stock stalls the cook; walking away = stuck bottom; it should pour lazily, not stand up.

STEP WRITING STANDARDS:
- Begin every step with an action verb: Slice, Heat, Add, Toss, Sear, Deglaze, Rest.
- Include specific quantities in every step instruction (e.g. "3 tbsp soy sauce", "200 g pasta") — never say "some" or "a bit".
- Include at least one sensory cue per step (colour, sound, smell, texture) so the cook can verify progress without a thermometer.
- CUTS MUST BE EXPLICIT AND CONSISTENT: the first time an ingredient is cut, state the exact shape AND approximate size — "cut the chicken into 1cm strips", "dice the onion into 1cm pieces", "slice the pepper into thin 0.5cm strips". Never write a bare "slice the chicken" or "chop the pepper" with no shape/size. Use the SAME cut word every time you refer to that ingredient afterwards — if step 1 makes strips, later steps say "strips", never "cubes" or "pieces".
- Any step that involves waiting — boiling, simmering, roasting, resting, marinating — MUST have a timerMinutes integer (not null).
- Steps that take no meaningful waiting time use timerMinutes: null.
- Combine related micro-actions (e.g. "add garlic" and "stir garlic") into one step — but NEVER combine actions that need different timers (see TIMERS rule below).
- Give exit criteria where precision matters: "until the sauce coats the back of a spoon", "until the skin is deep mahogany and releases cleanly".
- Write for a competent home cook. Assume they know how to hold a knife and operate a hob. Skip basic tutorials.

TIMERS — ONE TIMER PER STEP (critical):
- Each step has AT MOST ONE timed action and ONE timerMinutes integer. The cook starts that step's timer, does the thing, then taps Next. A step must never contain two different waits.
- When the cooking method or vessel changes — hob → oven, sear → roast, cook → rest, boil → drain — START A NEW STEP with its own timer. Transferring a pan to the oven is ALWAYS its own step. Resting is ALWAYS its own step.
- THE ONLY EXCEPTION: searing both sides of the same item in the same pan, back-to-back, may share one step. Set timerMinutes to the COMBINED total and say "total" in the text (e.g. sear skin-side 6 min then flip 2 min → one step, timerMinutes: 8, text reads "...about 8 minutes total").
- Worked example of CORRECT splitting for a seared-then-roasted thigh: Step A "Sear skin-side down then flip... about 8 minutes total" (timerMinutes: 8) → Step B "Transfer the pan to the oven and roast until 74°C / 165°F, 18 minutes" (timerMinutes: 18) → Step C "Rest 5 minutes" (timerMinutes: 5). Three steps, three timers — never one step with a 31-minute timer.

NO TIME RANGES (critical):
- Never write a range anywhere in instruction text. Not "5–6 minutes", not "18 to 20 minutes", not "about 5-6 min". Commit to ONE number.
- The minutes stated in a step's instruction text MUST exactly equal that step's timerMinutes. If timerMinutes is 18, the text says "18 minutes" and nothing else.
- The reference cook times listed below are minimums to choose FROM — output a single committed integer, never the printed range.

PROTEIN COOKING — SAFETY & TIMING (critical — never undercook to save time):
- Cook every meat, poultry and fish to a safe doneness with a REALISTIC time. If the time budget conflicts with safe cooking, prioritise safe cooking over speed.
- Every step that cooks a protein MUST include BOTH a timerMinutes integer AND a doneness cue — an internal temperature and/or a reliable visual ("no longer pink", "juices run clear", "opaque and flakes easily").
- Safe internal temperatures to state in the cue:
  - Poultry (chicken/turkey, any cut): 74°C / 165°F — juices clear, no pink at the bone.
  - Minced/ground meat (beef/pork/lamb/chicken): 71°C / 160°F — no pink.
  - Pork chops/loin: 63°C / 145°F, then rest 3 minutes.
  - Sausages: 71°C / 160°F — no pink in the centre.
  - Beef & lamb steaks/whole cuts: 52°C rare to 63°C medium (cook's choice), well-seared crust.
  - Fish: 63°C / 145°F or until opaque and it flakes easily.
- Realistic MINIMUM cook times — do not go below these for the cut:
  - Chicken breast (pan, medium heat): 6–8 min per side depending on thickness.
  - Chicken thighs: bone-in 25–35 min roasted or 12–15 min pan; boneless ~10–12 min.
  - Diced chicken: 8–12 min until cooked through.
  - Minced/ground meat: brown, then 8–10 min until no pink remains.
  - Pork chops: 5–7 min per side.
  - Steak: thick — sear each side then rest; thin — 2–3 min per side.

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

WHY THIS DISH — the confidence panel shown before the user commits:
- "reasons": 3–4 short, concrete points (max 8 words each) on why THIS dish is a
  great pick for THIS user right now. Ground them in their AVAILABLE ingredients,
  the vibe, and how forgiving the cook is. Speak to the user ("Uses your salmon",
  "Ready in 20 minutes", "Hard to overcook"). No generic filler.
- "completion": "High" if the user has everything (no requiredSwaps), "Medium" if
  only easy swaps/optional items are missing, "Low" if several swaps are needed.
  MUST agree with your own requiredSwaps/optionalMissing above.
- "effort": "Low" for a forgiving few-step dish, "Medium" for moderate technique,
  "High" for demanding timing/technique. Should track difficulty.
- "tasteNote": one short sentence (max 12 words) describing how the finished dish
  actually TASTES — the flavour, texture and what makes it good. Be specific and
  appetising, e.g. "Rich and garlicky with a bright chilli kick and silky sauce."
  Never a rating word like "Medium" — describe the flavour, don't score it.
- "flavourRationale": 2–3 sentences explaining WHY these ingredients belong together
  — the flavour logic a good cook would give. Name which ingredient carries the
  dish, what balances or lifts it (fat, acid, heat, sweetness, aromatics), and the
  cuisine tradition or classic pairing it follows. This is where you prove the dish
  respects real culinary rules so a cautious cook trusts it. Concrete, not generic
  ("The tomato's acidity cuts the richness of the cheese, a classic Italian balance"
  — not "the flavours work well together").
- "provenance": one word — "classic" if this is a recognised traditional dish,
  "adapted" if it's a known dish adjusted to the user's ingredients, or "original"
  if it's a new combination you composed for this kitchen. Be honest.

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
  "why": {
    "reasons": ["Uses your <ingredient>", "Ready in <n> minutes", "Hard to get wrong"],
    "completion": "High | Medium | Low",
    "effort": "High | Medium | Low",
    "tasteNote": "One short sentence on how the finished dish tastes",
    "flavourRationale": "2-3 sentences on why these ingredients belong together and the tradition/pairing it follows",
    "provenance": "classic | adapted | original"
  },
  "ingredients": [
    { "name": "<ingredient>", "quantity": "<specific amount + unit>", "inInventory": true }
  ],
  "steps": [
    { "number": 1, "summary": "<≤8-word gist of what this step does>", "instruction": "<Action verb> + <quantities> + <sensory cue>.", "timerMinutes": null },
    { "number": 2, "summary": "<≤8-word gist>", "instruction": "<Action verb> + <quantities> + <sensory cue>.", "timerMinutes": 5 }
  ]
}

STEP SUMMARY (the "summary" field):
- A plain-language gist of what the step accomplishes, so a cook can read ahead at a glance: "Soften the onions", "Sear the chicken", "Simmer the sauce", "Rest and serve".
- Max 8 words. No quantities, no temperatures, no timers — those live in the full instruction. Start with a verb. It complements the instruction; it does not repeat it.

SELF-CHECK before returning:
[ ] Every ingredient in the ingredients array appears in the user's AVAILABLE list.
[ ] Every waiting step has timerMinutes as an integer, not null.
[ ] No step contains more than one timed action. Pan→oven, cook→rest, and any vessel/method change are separate steps with their own timers. (Searing both sides in one pan may share one combined timer.)
[ ] No instruction text contains a time range — every time is a single integer, and it matches that step's timerMinutes exactly.
[ ] Every protein reaches a safe internal temperature, with a realistic cook time and a doneness cue (temperature or a reliable visual).
[ ] No step uses vague quantities ("some", "a bit", "to taste" without a default amount).
[ ] Every step has a "summary" — a ≤8-word verb-first gist with no quantities or timers.
[ ] The recipe is built on one of the STRUCTURAL SKELETONS — its method, step order and ratios follow that skeleton (adapted only in ingredient choice), and no copy claims the dish is tested/verified.
[ ] Dish name is specific and appetising.
[ ] "why" has 3–4 grounded reasons, completion + effort each set to High/Medium/Low (completion agrees with requiredSwaps), and a tasteNote that describes the flavour (not a rating word).
[ ] Description is ≤ 15 words and names the hero ingredient.
[ ] JSON is valid and complete — no trailing commas, no missing closing brackets.`;

// ── CORS ─────────────────────────────────────────────────────────────────────
// Never wildcard a paid, unauthenticated endpoint — reflect only our own origins
// so a third-party page can't spend the API budget from a user's browser.
// (Native apps don't send an Origin and aren't CORS-restricted, so they still work.)
const ALLOWED_ORIGIN: RegExp[] = [
  /^https:\/\/mise-spa(-code)?\.vercel\.app$/,
  /-aruns-projects-10c588ee\.vercel\.app$/, // this team's Vercel preview deploys
  /^http:\/\/localhost(:\d+)?$/,             // local dev
  /\.loca\.lt$/,                             // tunnel used for native web-preview testing
  /^capacitor:\/\/localhost$/,               // iOS Capacitor app (native WKWebView)
  /^ionic:\/\/localhost$/,                   // Capacitor (alt) / Ionic origin
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

// ── Slate: protein anchors & skeleton groups ───────────────────────────────
// The 3-recipe slate is generated as THREE PARALLEL single-recipe calls rather
// than one big call: three recipes in one response blew the 55s cap (measured
// 504 at 55.3s), whereas parallel calls finish in about the time of one (~25-35s).
//
// Variety is therefore guaranteed in CODE, not by asking one model call to
// self-dedupe: each call is handed a protein anchor (per the compatibility
// rules) and a DISJOINT group of skeletons to choose from — so two recipes can
// never land on the same skeleton, and no two can share protein_anchor +
// skeleton_id.

// Core protein family for an inventory item. Two proteins are COMPATIBLE only
// if they map to the same family (e.g. chicken breast + chicken thighs).
function proteinFamily(item: string): string | null {
  const l = item.toLowerCase();
  if (/chicken|turkey/.test(l)) return "chicken";
  if (/beef|steak|mince\b(?!.*(pork|lamb|chicken))/.test(l) && !/pork|lamb|chicken/.test(l)) return "beef";
  if (/pork|bacon|sausage|ham\b|gammon/.test(l)) return "pork";
  if (/lamb|mutton/.test(l)) return "lamb";
  if (/salmon/.test(l)) return "salmon";
  if (/prawn|shrimp/.test(l)) return "prawns";
  if (/tuna/.test(l)) return "tuna";
  if (/cod|haddock|pollock|sea bass|plaice|coley|white fish|mackerel|sardine|herring|\bfish\b/.test(l)) return "fish";
  if (/\begg/.test(l)) return "eggs";
  if (/tofu|tempeh/.test(l)) return "tofu";
  if (/chickpea|garbanzo/.test(l)) return "chickpeas";
  if (/lentil|\bdal\b|daal/.test(l)) return "lentils";
  if (/bean|pulse/.test(l)) return "beans";
  return null;
}

// Assign the anchor for each of the 3 slate recipes, per the slate rules.
// Returns 3 human-readable anchor descriptors handed to each parallel call.
function assignAnchors(proteins: string[]): string[] {
  // Group the user's proteins by core family, preserving selection order.
  const families: { family: string; items: string[] }[] = [];
  for (const p of proteins) {
    const f = proteinFamily(p);
    if (!f) continue;
    const existing = families.find(x => x.family === f);
    if (existing) existing.items.push(p);
    else families.push({ family: f, items: [p] });
  }

  // 0 proteins → vegetables are the anchor for all three.
  if (families.length === 0) return ["vegetable-led", "vegetable-led", "vegetable-led"];

  // 1 family (incl. 2 COMPATIBLE cuts) → all 3 anchor on it; the cuts may be
  // combined or used individually. Skeleton variety keeps the slate distinct.
  if (families.length === 1) {
    const d = families[0].items.length > 1
      ? `${families[0].items.join(" and ")} (same core protein — combine them or use either)`
      : families[0].items[0];
    return [d, d, d];
  }

  // 2+ NON-COMPATIBLE families → one per recipe, no priority between them.
  // With 2 families, recipe 3 reuses the first family on a different skeleton.
  const d = (i: number) => families[i].items.join(" and ");
  if (families.length === 2) return [d(0), d(1), d(0)];
  // 3+ families → the first three; it is expected that some proteins don't appear.
  return [d(0), d(1), d(2)];
}

// Three DISJOINT skeleton groups. Each parallel call picks the best-fitting
// skeleton from its own group, so the slate can never repeat a skeleton.
const SKELETON_GROUPS: string[][] = [
  ["SK-06 Pan-sear + pan sauce", "SK-01 Stir-fry", "SK-02 Fried rice"],
  ["SK-04 Curry", "SK-10 Chilli / quick braise", "SK-03 Tomato-base pasta", "SK-07 Soup"],
  ["SK-05 Traybake", "SK-09 Noodle bowl", "SK-11 Grain bowl", "SK-08 Frittata / omelette-bake", "SK-12 Risotto-method"],
];

// One streamed Anthropic call → raw text. Shared by single and slate modes.
// Models this endpoint is allowed to use. Sonnet is the default and what the
// app ships with; the allowlist exists so a `model` override in the request can
// never point at an arbitrary (or more expensive) model.
const MODEL_ALLOW: Record<string, string> = {
  sonnet: "claude-sonnet-4-6",
  haiku: "claude-haiku-4-5-20251001",
};
const DEFAULT_MODEL = "claude-sonnet-4-6";

async function callModel(
  apiKey: string,
  model: string,
  userMessage: string,
  maxTokens: number,
  signal: AbortSignal,
): Promise<{ text: string; usage: any; stopReason: string | null }> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "prompt-caching-2024-07-31",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      stream: true,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("Anthropic error:", response.status, err);
    throw new Error("generation_failed");
  }

  let text = "";
  let stopReason: string | null = null;
  let usage: any = {};
  const reader = response.body?.getReader();
  if (reader) {
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const s = line.trim();
        if (!s.startsWith("data:")) continue;
        const payload = s.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        let evt: any;
        try { evt = JSON.parse(payload); } catch { continue; }
        if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
          text += evt.delta.text;
        } else if (evt.type === "message_start") {
          usage = { ...usage, ...(evt.message?.usage ?? {}) };
        } else if (evt.type === "message_delta") {
          if (evt.delta?.stop_reason) stopReason = evt.delta.stop_reason;
          if (evt.usage) usage = { ...usage, ...evt.usage };
        } else if (evt.type === "error") {
          console.error("Anthropic stream error:", JSON.stringify(evt.error));
        }
      }
    }
  }
  return { text, usage, stopReason };
}

// Post-process one model recipe: drop it if malformed, otherwise normalise time
// ranges and sanitise the "why" panel. Shared by single and slate modes.
const TIME_RANGE_RE = /(\d+)\s*(?:[–—-]|to|or)\s*(\d+)(\s*(?:minutes?|mins?))/i;
function postProcessRecipe(recipe: any): any | null {
  if (!recipe || !recipe.name || !recipe.steps) return null;

  const normalizeStepRange = (step: any) => {
    if (typeof step?.instruction !== "string") return step;
    const match = step.instruction.match(TIME_RANGE_RE);
    if (!match) return step;
    const upper = Number(match[2]);
    return {
      ...step,
      instruction: step.instruction.replace(TIME_RANGE_RE, `${upper}${match[3]}`),
      timerMinutes: Number.isInteger(step.timerMinutes) ? upper : step.timerMinutes,
    };
  };
  if (Array.isArray(recipe.steps)) recipe.steps = recipe.steps.map(normalizeStepRange);

  const asMeter = (v: unknown): "Low" | "Medium" | "High" | null => {
    const s = String(v ?? "").trim().toLowerCase();
    return s === "high" ? "High" : s === "medium" ? "Medium" : s === "low" ? "Low" : null;
  };
  const w = recipe.why;
  if (w && typeof w === "object") {
    const reasons = Array.isArray(w.reasons)
      ? w.reasons.filter((r: unknown) => typeof r === "string" && r.trim()).map((r: string) => r.trim()).slice(0, 4)
      : [];
    const completion = asMeter(w.completion);
    const effort = asMeter(w.effort);
    const tasteNote = typeof w.tasteNote === "string" ? w.tasteNote.trim().slice(0, 140) : "";
    const flavourRationale = typeof w.flavourRationale === "string" ? w.flavourRationale.trim().slice(0, 400) : "";
    const prov = String(w.provenance ?? "").trim().toLowerCase();
    const provenance = prov === "classic" ? "classic" : prov === "adapted" ? "adapted" : prov === "original" ? "original" : undefined;
    recipe.why = reasons.length && completion && effort && tasteNote
      ? { reasons, completion, effort, tasteNote, flavourRationale: flavourRationale || undefined, provenance }
      : undefined;
  } else {
    recipe.why = undefined;
  }
  return recipe;
}

function parseRecipeText(raw: string): any | null {
  const cleaned = raw.replace(/```json|```/g, "").trim();
  let parsed: any;
  try { parsed = JSON.parse(cleaned); } catch { return null; }
  if (parsed?.error === "no_recipe") return { error: "no_recipe" };
  return postProcessRecipe(parsed);
}

// ── Handler ────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(req, res);

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

  // ── App gate — reject unauthenticated callers (no-op until configured) ───
  if (!appRequestAllowed(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // ── Auth & validation ───────────────────────────────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("FATAL: ANTHROPIC_API_KEY env var is not set in Vercel Environment Variables");
    return res.status(500).json({ error: "API key not configured" });
  }

  const { inventory, session, excludeName, avoidRecipes, mealType, slate, model } = req.body ?? {};
  if (!inventory) return res.status(400).json({ error: "Missing inventory" });
  const wantSlate = slate === true;
  // Optional model override, allowlisted. The app never sends this — it exists
  // so model quality/latency can be compared against production traffic shape.
  const chosenModel = (typeof model === "string" && MODEL_ALLOW[model]) || DEFAULT_MODEL;

  // Time-of-day meal (computed client-side from the user's local clock).
  const meal: string | null = ["breakfast", "lunch", "dinner"].includes(mealType) ? mealType : null;

  const ingredients = [
    ...(inventory.proteins   || []),
    ...(inventory.carbs      || []),
    ...(inventory.vegetables || []),
    ...(inventory.staples    || []),
    ...(inventory.fridge     || []),
  ].filter(Boolean);

  if (ingredients.length === 0) return res.status(400).json({ error: "No ingredients" });

  // Dishes the user has recently cooked — generate something genuinely different.
  const avoidList: string[] = Array.isArray(avoidRecipes)
    ? avoidRecipes.filter((n: unknown) => typeof n === "string" && n.trim()).slice(0, 10)
    : [];

  // Vibe / "what matters tonight" — maps the client's selected value to a
  // concrete steer for the model. Keep keys in sync with VIBES in
  // src/lib/mise-data.ts. Unknown/empty → no steer (best all-round match).
  const VIBE_GUIDANCE: Record<string, string> = {
    "use-up": "Prioritise using up the most perishable ingredients (fresh veg, herbs, dairy, opened items) before they spoil — build the dish around what needs eating first.",
    quick: "Favour a genuinely fast, low-fuss dish: minimal steps, few pans, quick cleanup.",
    comfort: "Lean into warm, hearty, satisfying comfort food.",
    healthy: "Favour a lighter, nourishing, vegetable-forward dish; go easy on heavy fats and frying.",
    different: "Pick something outside the usual weeknight routine — a less obvious cuisine, flavour or technique the user probably hasn't tried.",
  };
  const vibeKey: unknown = Array.isArray(session?.vibes) ? session.vibes[0] : undefined;
  const vibeSteer = typeof vibeKey === "string" && VIBE_GUIDANCE[vibeKey] ? VIBE_GUIDANCE[vibeKey] : "";

  // ── Dynamic user message (changes per request — not cached) ────────────
  // Shared kitchen context, composed into a single-recipe request or into each
  // of the 3 parallel slate requests.
  const contextBlock =
    `AVAILABLE: ${ingredients.join(", ")}
APPLIANCES: ${(inventory.appliances || ["Hob/Stove"]).join(", ")}
TIME: max ${session?.timeMinutes ?? 30} minutes
SERVINGS: ${session?.servings ?? 2}
${session?.cuisine ? `CUISINE: ${session.cuisine}` : "CUISINE: your choice — be creative, avoid repeating the same cuisine twice"}
${vibeSteer ? `VIBE: ${vibeSteer}` : ""}
${meal === "breakfast"
  ? `MEAL: It is currently BREAKFAST time. Generate a genuine breakfast dish.
- PRIORITISE breakfast ingredients from the AVAILABLE list: bacon, sausages, eggs, oats, bread/toast, tortillas, potatoes (hash), milk, yoghurt, cheese, tomatoes, mushrooms, spinach.
- DE-PRIORITISE dinner proteins (chicken, lamb, beef/steak, pork chops, fish): do NOT build the dish around them even if selected — leave them for lunch/dinner.
- If the AVAILABLE list has NO breakfast-appropriate ingredients at all, do NOT force a weird dish — return exactly: {"error":"no_recipe"}`
  : meal
    ? `MEAL: It is currently ${meal} time. Generate a dish appropriate for ${meal} — a proper main. Feature the user's selected protein as the hero.`
    : ""}`;

  const baseTail = `At lunch and dinner: if the user selected a meat, poultry or fish protein, it MUST be the hero of the dish. At breakfast the MEAL rule above wins — breakfast ingredients take priority over dinner proteins. You do NOT need to use every ingredient — choose the combination that makes the best single dish. Treat different cuts of the same meat as interchangeable (e.g. lamb chops, lamb diced and lamb mince are all just "lamb"); the cut should not change which dish you pick.`;
  const excludeClause = excludeName ? `\n\nDo NOT generate "${excludeName}" — the user has already seen that recipe and wants something different.` : "";
  const avoidClause = avoidList.length ? `\n\nThe user has RECENTLY COOKED the dishes below. You MUST generate something clearly different — a different cooking method, flavour profile, or cuisine. Do not produce a near-duplicate or a minor variation of any of these, even if a different cut of the same protein is now selected:\n${avoidList.map(n => `- ${n}`).join("\n")}` : "";

  const userMessage =
    `Generate a recipe using the ingredients below.\n\n${contextBlock}\n\n${baseTail}${excludeClause}${avoidClause}`;

  // One slate recipe's brief: a fixed protein anchor + a disjoint skeleton group,
  // so the three parallel calls can't collide on protein_anchor + skeleton_id.
  // `forceSkeleton` is used on a retry when the model ignored its allowed group:
  // instead of offering a choice we name the one skeleton it must use.
  const slateMessage = (anchor: string, group: string[], forceSkeleton?: string) => {
    const ids = group.map(g => g.split(" ")[0]);
    return `Generate ONE recipe using the ingredients below. It is one of three alternatives shown together, so the HARD CONSTRAINTS below are not suggestions — a recipe that breaks any of them is rejected.

━━ HARD CONSTRAINT 1 — SKELETON ━━
${forceSkeleton
      ? `You MUST use exactly this skeleton: ${forceSkeleton}. Set "skeleton_id" to "${forceSkeleton.split(" ")[0]}". Do not use any other skeleton.`
      : `You MUST build this recipe on ONE skeleton from this list and NOTHING else:
${group.map(g => `    • ${g}`).join("\n")}
Allowed values for "skeleton_id" are EXACTLY: ${ids.join(", ")}.
Pick whichever of THOSE best fits the AVAILABLE ingredients and APPLIANCES, then follow its structure and ratios from the system prompt.
Using any skeleton outside that list — however well it might fit — is an error. Before you answer, re-read your skeleton_id and confirm it is one of: ${ids.join(", ")}.`}

━━ HARD CONSTRAINT 2 — ANCHOR ━━
${anchor === "vegetable-led"
      ? "Build this dish around vegetables. There is no meat/fish hero — it is vegetable-led."
      : `Build this dish around ${anchor}. That is the hero and must be the centre of the dish.`}

━━ HARD CONSTRAINT 3 — TIMERS ━━
This app runs a countdown per step, so timers are the product, not decoration.
EVERY step with any wait — searing, frying, sautéing, simmering, boiling, roasting, baking, braising, reducing, resting — MUST have an integer "timerMinutes".
Only pure off-heat prep (chopping, measuring, mixing, plating) may use null.
Write 7 to 9 steps. Typically 5 or more of them are timed. A cooking step with "timerMinutes": null is an error.

${contextBlock}

${baseTail}${avoidClause}

In addition to every field in the system prompt's RETURN FORMAT, this recipe object MUST also include:
  "protein_anchor": "${anchor === "vegetable-led" ? "vegetable-led" : "<the specific protein ingredient you used as the hero>"}",
  "skeleton_id": "<the SK-NN id you used — must be ${forceSkeleton ? forceSkeleton.split(" ")[0] : `one of ${ids.join(", ")}`}>"

Return the single recipe JSON object only — no markdown fences, no text before or after.`;
  };

  // Hourly circuit breaker — checked/incremented only here, after validation and
  // right before the paid call, so malformed/empty requests can't burn the budget.
  if (globalCapReached()) {
    console.warn("Global hourly generation cap hit — shedding load.");
    return res.status(429).json({
      error: "The kitchen's a little busy right now. Please try again shortly.",
    });
  }

  // ── Anthropic call(s) with prompt caching ──────────────────────────────
  // The system block is sent with cache_control so Anthropic caches it after
  // the first request. Subsequent calls with the same system text pay only for
  // the cache read (10% of normal input cost) instead of full token ingestion.
  // AbortController bounds the call so a slow upstream returns a deterministic
  // 504 instead of pinning the function until Vercel's maxDuration.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55000); // < 60s maxDuration
  try {
    if (wantSlate) {
      // Three recipes as three PARALLEL single-recipe calls. Wall time is the
      // SLOWEST call (~25-35s), not the sum — asking one call to produce all
      // three overshot the 55s cap. Each call gets a fixed protein anchor and a
      // disjoint skeleton group, so slate variety is guaranteed in code rather
      // than by hoping one model call self-dedupes.
      const anchors = assignAnchors(inventory.proteins || []);
      // This request costs three generations — take two more cap slots.
      globalCapReached(); globalCapReached();

      // Run one round of the three calls; `force` pins a specific skeleton on a
      // retry. Returns the parsed recipe per slot (null where it failed).
      const runRound = async (force: (string | undefined)[]) => {
        const settled = await Promise.allSettled(
          anchors.map((anchor, i) =>
            force[i] === "skip"
              ? Promise.resolve(null as any)
              : callModel(apiKey, chosenModel, slateMessage(anchor, SKELETON_GROUPS[i], force[i]), 4000, controller.signal),
          ),
        );
        return settled.map((r) => {
          if (r.status !== "fulfilled" || !r.value) {
            if (r.status === "rejected") console.error("Slate call failed:", r.reason);
            return null;
          }
          logUsage(req, "generate", chosenModel, r.value.usage);
          if (r.value.stopReason === "max_tokens") {
            console.error("Slate recipe hit max_tokens — JSON truncated.");
          }
          const parsed = parseRecipeText(r.value.text);
          return !parsed || parsed.error === "no_recipe" ? null : parsed;
        });
      };

      const allowedIds = SKELETON_GROUPS.map(g => g.map(s => s.split(" ")[0]));
      const inGroup = (r: any, i: number) =>
        !!r && allowedIds[i].includes(String(r.skeleton_id ?? "").toUpperCase());

      let slots = await runRound([undefined, undefined, undefined]);

      // Weaker models sometimes ignore their allowed skeleton list, which
      // collapses the slate's variety (two near-identical dishes). Rather than
      // trust the prompt, verify: any slot whose skeleton_id is out of its group
      // is regenerated ONCE with a single skeleton pinned — one that no other
      // slot is already using, so the slate still ends up with three distinct
      // structures. Bounded to one retry round so latency stays predictable.
      const needsRetry = slots.map((r, i) => r !== null && !inGroup(r, i));
      if (needsRetry.some(Boolean)) {
        const taken = new Set(
          slots.filter((r, i) => inGroup(r, i)).map(r => String(r.skeleton_id).toUpperCase()),
        );
        const force = slots.map((_, i) => {
          if (!needsRetry[i]) return "skip";
          const pick = SKELETON_GROUPS[i].find(s => !taken.has(s.split(" ")[0])) ?? SKELETON_GROUPS[i][0];
          taken.add(pick.split(" ")[0]);
          console.warn(`Slate slot ${i}: skeleton ${slots[i].skeleton_id} out of group — retrying pinned to ${pick.split(" ")[0]}`);
          return pick;
        });
        const retried = await runRound(force);
        slots = slots.map((r, i) => (needsRetry[i] && retried[i] ? retried[i] : r));
      }

      const recipes: any[] = [];
      const seen = new Set<string>();
      for (const parsed of slots) {
        if (!parsed) continue;
        // Belt and braces: never return two recipes sharing the same
        // protein_anchor AND skeleton_id.
        const key = `${String(parsed.protein_anchor ?? "").toLowerCase()}|${String(parsed.skeleton_id ?? "").toUpperCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        recipes.push(parsed);
      }

      // Every call failed — report honestly rather than returning an empty slate.
      if (recipes.length === 0) return res.status(502).json({ error: "Generation failed" });
      return res.status(200).json({ recipes });
    }

    const { text, usage, stopReason } = await callModel(apiKey, chosenModel, userMessage, 4000, controller.signal);
    logUsage(req, "generate", chosenModel, usage);
    // Truncation guard: if the model ran out of output budget the JSON is cut
    // off — surface it in logs instead of a mystery parse error.
    if (stopReason === "max_tokens") {
      console.error("Anthropic response hit max_tokens — recipe JSON truncated.");
    }
    const recipe = parseRecipeText(text);
    if (!recipe) return res.status(502).json({ error: "Invalid JSON from model" });
    // Model honestly declined (e.g. no breakfast-appropriate ingredients).
    if (recipe.error === "no_recipe") return res.status(200).json({ error: "no_recipe" });
    return res.status(200).json(recipe);
  } catch (err: any) {
    if (err?.name === "AbortError") {
      console.error("Anthropic request timed out");
      return res.status(504).json({ error: "Generation timed out — please try again." });
    }
    // Upstream (Anthropic) returned a non-2xx — surfaced by callModel.
    if (err?.message === "generation_failed") {
      return res.status(502).json({ error: "Generation failed" });
    }
    console.error("Handler error:", err);
    return res.status(500).json({ error: "Internal error" });
  } finally {
    clearTimeout(timeout);
  }
}
