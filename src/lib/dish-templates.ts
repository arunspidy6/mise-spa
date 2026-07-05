// ── Layer 2: Dish knowledge base ─────────────────────────────────────────────
// The decision engine does NOT store finished recipes it hands to the user. It
// reasons over *dish templates* — structured descriptions of what a dish needs,
// what it can flex on, and what's purely optional. The recommendation engine
// (findRecipes/scoreTemplate in generate-recipe.ts) filters and ranks these;
// the LLM/adaptation layer only fills in friendly, scaled steps.
//
// Each `req` carries a criticality that drives the whole decision:
//   • essential  → dish identity. Missing ⇒ dish is infeasible, never shown.
//   • important  → flexible/supporting. Missing ⇒ a swap note, dish still works.
//   • optional   → flavour enhancer. Missing ⇒ ignored silently, no warning.
//
// These templates are merged ahead of the protein-forward BASE_LIBRARY so the
// decision-first scenarios (use-up veg, tomato pasta, root-veg tray bake) have
// first-class, coherent dishes to win with. Types live in generate-recipe.ts
// and are imported type-only here to keep the engine ⇄ knowledge-base dependency
// one-directional at runtime.
import type { Template } from "./generate-recipe";

const img = (q: string, seed: number) =>
  `https://image.pollinations.ai/prompt/${encodeURIComponent(q)}?width=800&height=500&nologo=true&seed=${seed}`;

export const DECISION_TEMPLATES: Template[] = [
  // ── Scenario 1: chicken + potatoes + carrots ───────────────────────────────
  {
    name: "Rustic Chicken & Root Vegetable Tray Bake",
    cuisine: "Comfort",
    time_minutes: 50,
    difficulty: 1,
    tags: ["roasted", "one-tray", "chicken", "root-veg", "comfort", "use-up", "oven"],
    description:
      "Everything roasts together on one tray — juicy chicken over caramelised potatoes and sweet root veg. Almost no hands-on work and very hard to get wrong.",
    image: img("rustic chicken root vegetable tray bake potatoes carrots rosemary food photo", 41),
    reqs: [
      { token: "chicken thighs", label: "Chicken", criticality: "essential" },
      { token: "potatoes", label: "Potatoes", criticality: "essential" },
      { token: "olive oil", label: "Cooking oil", criticality: "essential", substitute: "any roasting oil or butter" },
      { token: "carrots", label: "Carrots", criticality: "important", substitute: "parsnip, sweet potato or any firm root veg" },
      { token: "onion", label: "Onion", criticality: "important", substitute: "leek, or leave out" },
      { token: "salt", label: "Salt", criticality: "important", substitute: "season generously" },
      { token: "garlic", label: "Garlic", criticality: "optional", substitute: "skip" },
      { token: "rosemary", label: "Rosemary or thyme", criticality: "optional", substitute: "skip" },
      { token: "pepper", label: "Black pepper", criticality: "optional", substitute: "skip" },
    ],
    ingredients: [
      { name: "Chicken thighs", quantity: "500g bone-in" },
      { name: "Potatoes", quantity: "500g" },
      { name: "Carrots", quantity: "250g" },
      { name: "Onion", quantity: "1" },
      { name: "Olive oil", quantity: "3 tbsp" },
      { name: "Salt", quantity: "1.5 tsp" },
      { name: "Garlic", quantity: "4 cloves" },
      { name: "Rosemary", quantity: "2 sprigs" },
      { name: "Black pepper", quantity: "1 tsp" },
    ],
    steps: [
      { number: 1, instruction: "Heat the oven to 220°C. Cut 500g potatoes into 3cm chunks and 250g carrots into 2cm batons. Cut 1 onion into thick wedges.", timerMinutes: null },
      { number: 2, instruction: "Tip the vegetables into a large roasting tray. Add 2 tbsp olive oil, 1 tsp salt and 4 smashed garlic cloves, then toss until glossy and spread in one layer.", timerMinutes: null },
      { number: 3, instruction: "Pat 500g chicken thighs dry, rub with the last 1 tbsp oil and remaining salt, and nestle skin-side up among the veg with 2 sprigs rosemary.", timerMinutes: null },
      { number: 4, instruction: "Roast until the veg edges start to colour and the kitchen smells sweet.", timerMinutes: 25 },
      { number: 5, instruction: "Turn the vegetables, leave the chicken untouched, and roast on until the skin is deep golden and crisp.", timerMinutes: 20 },
      { number: 6, instruction: "Rest 5 minutes so the juices settle, then spoon the pan juices over everything to serve.", timerMinutes: 5 },
    ],
  },

  // ── Scenario 2: spaghetti + tomato (NO cream — a coherent no-cream dish) ────
  {
    name: "Silky Tomato Pasta",
    cuisine: "Italian",
    time_minutes: 25,
    difficulty: 1,
    tags: ["pasta", "tomato", "quick", "vegetarian", "weeknight", "use-up"],
    description:
      "A glossy, deeply savoury tomato sauce that clings to every strand — built from a few good ingredients, no cream needed. The pasta water does the silky work.",
    image: img("silky tomato spaghetti pasta basil olive oil italian food photo", 42),
    reqs: [
      { token: "pasta", label: "Pasta", criticality: "essential" },
      { token: "tomatoes", label: "Tomatoes", criticality: "essential", substitute: "a tin of chopped tomatoes or passata" },
      { token: "olive oil", label: "Olive oil", criticality: "essential", substitute: "any cooking oil or butter" },
      { token: "garlic", label: "Garlic", criticality: "important", substitute: "½ tsp garlic powder, or onion" },
      { token: "salt", label: "Salt", criticality: "important", substitute: "salt the pasta water well" },
      { token: "onion", label: "Onion", criticality: "optional", substitute: "skip" },
      { token: "tomato paste", label: "Tomato paste", criticality: "optional", substitute: "skip" },
      { token: "chilli flakes", label: "Chilli flakes", criticality: "optional", substitute: "skip" },
      { token: "parmesan", label: "Parmesan", criticality: "optional", substitute: "any hard cheese, or skip" },
    ],
    ingredients: [
      { name: "Spaghetti", quantity: "200g" },
      { name: "Tomatoes", quantity: "400g ripe (or 1 tin)" },
      { name: "Garlic", quantity: "3 cloves" },
      { name: "Olive oil", quantity: "3 tbsp" },
      { name: "Salt", quantity: "for the water + 1/2 tsp" },
      { name: "Tomato paste", quantity: "1 tbsp" },
      { name: "Chilli flakes", quantity: "1/2 tsp" },
      { name: "Parmesan", quantity: "to serve" },
    ],
    steps: [
      { number: 1, instruction: "Bring a large pan of well-salted water to the boil. Meanwhile, thinly slice 3 garlic cloves and roughly chop 400g tomatoes.", timerMinutes: null },
      { number: 2, instruction: "Warm 3 tbsp olive oil in a wide pan over medium heat. Add the garlic and cook until fragrant and just barely golden — don't let it brown.", timerMinutes: 2 },
      { number: 3, instruction: "Stir in 1 tbsp tomato paste and ½ tsp chilli flakes, cook for 1 minute, then add the tomatoes and ½ tsp salt. Simmer, crushing the tomatoes, until jammy and glossy.", timerMinutes: 12 },
      { number: 4, instruction: "Drop 200g spaghetti into the boiling water and cook until just shy of al dente, reserving a mug of pasta water before draining.", timerMinutes: 9 },
      { number: 5, instruction: "Add the drained pasta to the sauce with a splash of pasta water. Toss hard over the heat until the sauce turns silky and coats every strand.", timerMinutes: 2 },
      { number: 6, instruction: "Loosen with a little more pasta water if needed and serve with grated parmesan on top.", timerMinutes: null },
    ],
  },

  // ── Scenario 3: chicken + rice + limited pantry ────────────────────────────
  {
    name: "One-Pan Chicken & Rice",
    cuisine: "Comfort",
    time_minutes: 40,
    difficulty: 2,
    tags: ["one-pan", "chicken", "rice", "comfort", "budget", "use-up"],
    description:
      "Chicken and rice cooked together in one pan so the grains drink up all the savoury juices. Leans on the pantry basics you almost certainly already have.",
    image: img("one pan chicken and rice pilaf onion golden comfort food photo", 43),
    reqs: [
      { token: "chicken thighs", label: "Chicken", criticality: "essential" },
      { token: "rice", label: "Rice", criticality: "essential" },
      { token: "olive oil", label: "Cooking oil", criticality: "essential", substitute: "butter" },
      { token: "onion", label: "Onion", criticality: "important", substitute: "leave out, add extra garlic" },
      { token: "stock cubes", label: "Stock", criticality: "important", substitute: "water + extra salt" },
      { token: "salt", label: "Salt", criticality: "important", substitute: "season each layer" },
      { token: "garlic", label: "Garlic", criticality: "optional", substitute: "skip" },
      { token: "paprika", label: "Paprika", criticality: "optional", substitute: "skip" },
      { token: "pepper", label: "Black pepper", criticality: "optional", substitute: "skip" },
    ],
    ingredients: [
      { name: "Chicken thighs", quantity: "500g" },
      { name: "Rice", quantity: "185g" },
      { name: "Onion", quantity: "1" },
      { name: "Stock", quantity: "400ml" },
      { name: "Olive oil", quantity: "1 tbsp" },
      { name: "Salt", quantity: "1 tsp" },
      { name: "Garlic", quantity: "3 cloves" },
      { name: "Paprika", quantity: "1 tsp" },
    ],
    steps: [
      { number: 1, instruction: "Pat 500g chicken thighs dry and season with 1 tsp salt and 1 tsp paprika. Finely dice 1 onion and mince 3 garlic cloves.", timerMinutes: null },
      { number: 2, instruction: "Heat 1 tbsp oil in a lidded pan over medium-high and brown the chicken skin-side down until deep golden, then lift out — it won't be cooked through yet.", timerMinutes: 6 },
      { number: 3, instruction: "Lower the heat, add the onion and garlic to the same pan and soften in the chicken fat until translucent and sweet.", timerMinutes: 4 },
      { number: 4, instruction: "Stir in 185g rice to coat in the oil for 1 minute, then pour in 400ml hot stock and scrape the base clean.", timerMinutes: 1 },
      { number: 5, instruction: "Sit the chicken back on top, bring to a simmer, cover tightly and cook on low until the rice is tender and the liquid absorbed.", timerMinutes: 18 },
      { number: 6, instruction: "Rest off the heat, still covered, then fluff the rice around the chicken and serve.", timerMinutes: 5 },
    ],
  },

  // ── Use-up / healthy vegetarian option (broadens intent coverage) ──────────
  {
    name: "Golden Chickpea & Tomato Curry",
    cuisine: "Indian",
    time_minutes: 30,
    difficulty: 1,
    tags: ["vegetarian", "healthy", "curry", "chickpeas", "tomato", "use-up", "budget"],
    description:
      "A warming, golden chickpea curry that comes together from tins and pantry spices. Naturally plant-based, filling, and forgiving to whatever veg needs using up.",
    image: img("golden chickpea tomato curry coriander indian food photo", 44),
    reqs: [
      { token: "chickpeas", label: "Chickpeas", criticality: "essential", substitute: "any tinned beans or lentils" },
      { token: "tomatoes", label: "Tomatoes", criticality: "essential", substitute: "a tin of chopped tomatoes" },
      { token: "onion", label: "Onion", criticality: "important", substitute: "leave out" },
      { token: "olive oil", label: "Cooking oil", criticality: "important", substitute: "butter" },
      { token: "cumin", label: "Cumin", criticality: "important", substitute: "curry powder" },
      { token: "salt", label: "Salt", criticality: "important", substitute: "season to taste" },
      { token: "garlic", label: "Garlic", criticality: "optional", substitute: "skip" },
      { token: "turmeric", label: "Turmeric", criticality: "optional", substitute: "skip" },
      { token: "coriander", label: "Fresh coriander", criticality: "optional", substitute: "skip" },
    ],
    ingredients: [
      { name: "Chickpeas", quantity: "1 tin (400g)" },
      { name: "Tomatoes", quantity: "400g (or 1 tin)" },
      { name: "Onion", quantity: "1" },
      { name: "Olive oil", quantity: "2 tbsp" },
      { name: "Cumin", quantity: "1 tsp" },
      { name: "Turmeric", quantity: "1/2 tsp" },
      { name: "Garlic", quantity: "3 cloves" },
      { name: "Salt", quantity: "1 tsp" },
    ],
    steps: [
      { number: 1, instruction: "Finely dice 1 onion and mince 3 garlic cloves. Drain and rinse a 400g tin of chickpeas.", timerMinutes: null },
      { number: 2, instruction: "Warm 2 tbsp oil in a pan over medium heat, add 1 tsp cumin and ½ tsp turmeric and let them sizzle until fragrant, about 30 seconds.", timerMinutes: 1 },
      { number: 3, instruction: "Add the onion and garlic with ½ tsp salt and cook until soft and golden at the edges.", timerMinutes: 6 },
      { number: 4, instruction: "Stir in 400g chopped tomatoes and simmer, breaking them down, until the sauce darkens and thickens.", timerMinutes: 8 },
      { number: 5, instruction: "Fold in the chickpeas with a splash of water and the remaining salt, then simmer gently so they soak up the sauce.", timerMinutes: 8 },
      { number: 6, instruction: "Taste and adjust the salt, then scatter with fresh coriander to serve, with rice or bread alongside.", timerMinutes: null },
    ],
  },

  // ── Egg + potato use-up (any-time, near-empty fridge) ──────────────────────
  {
    name: "Crispy Potato & Egg Hash",
    cuisine: "Comfort",
    time_minutes: 25,
    difficulty: 1,
    tags: ["eggs", "potato", "quick", "vegetarian", "breakfast", "use-up", "budget"],
    description:
      "Golden, crisp-edged potatoes with eggs cooked right into the pan. A near-empty-fridge hero that turns a few humble things into something genuinely satisfying.",
    image: img("crispy potato egg hash skillet golden comfort food photo", 45),
    reqs: [
      { token: "potatoes", label: "Potatoes", criticality: "essential" },
      { token: "eggs", label: "Eggs", criticality: "essential" },
      { token: "olive oil", label: "Cooking oil", criticality: "essential", substitute: "butter" },
      { token: "onion", label: "Onion", criticality: "important", substitute: "leave out" },
      { token: "salt", label: "Salt", criticality: "important", substitute: "season well" },
      { token: "paprika", label: "Paprika", criticality: "optional", substitute: "skip" },
      { token: "chilli flakes", label: "Chilli flakes", criticality: "optional", substitute: "skip" },
      { token: "pepper", label: "Black pepper", criticality: "optional", substitute: "skip" },
    ],
    ingredients: [
      { name: "Potatoes", quantity: "400g" },
      { name: "Eggs", quantity: "4" },
      { name: "Onion", quantity: "1" },
      { name: "Olive oil", quantity: "2 tbsp" },
      { name: "Salt", quantity: "1 tsp" },
      { name: "Paprika", quantity: "1/2 tsp" },
    ],
    steps: [
      { number: 1, instruction: "Cut 400g potatoes into 1.5cm cubes and dice 1 onion. Parboil the potatoes in salted water for 5 minutes, then drain well and steam-dry.", timerMinutes: 5 },
      { number: 2, instruction: "Heat 2 tbsp oil in a wide pan over medium-high and add the potatoes in one layer with 1 tsp salt and ½ tsp paprika. Leave them to crisp before stirring.", timerMinutes: 6 },
      { number: 3, instruction: "Add the onion and continue frying, turning occasionally, until the potatoes are deep golden and the onion is soft.", timerMinutes: 6 },
      { number: 4, instruction: "Make 4 wells in the hash and crack an egg into each. Season the eggs.", timerMinutes: null },
      { number: 5, instruction: "Cover the pan and cook until the whites are just set but the yolks stay runny.", timerMinutes: 4 },
      { number: 6, instruction: "Serve straight from the pan, breaking the yolks over the crisp potatoes.", timerMinutes: null },
    ],
  },
];
