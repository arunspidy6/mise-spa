import type { Inventory, Recipe, RecipeIngredient, RecipeStep } from "@/store/mise";

// ── Types ──────────────────────────────────────────────────────────────────

type SessionPayload = {
  timeMinutes: number;
  servings: number;
  cuisine: string | null;
  vibes: string[];
};

type Criticality = "essential" | "important" | "optional";

type Req = {
  token: string;         // lowercase match key
  label: string;         // display name
  criticality: Criticality;
  substitute?: string;   // plain-english swap
};

type Template = {
  name: string;
  cuisine: string;
  description: string;
  time_minutes: number;
  difficulty: 1 | 2 | 3;
  reqs: Req[];
  ingredients: { name: string; quantity: string }[];
  steps: RecipeStep[];
  image: string;
  tags?: string[];
};

// ── Satisfiers — maps recipe token to acceptable user inventory strings ────

const SAT: Record<string, string[]> = {
  "chicken thighs":  ["chicken thighs"],
  "chicken breast":  ["chicken breast"],
  "beef mince":      ["beef mince", "mince"],
  "steak":      ["steak", "beef steak"],
  "pork chops": ["pork chops", "pork", "pork chop"],
  "lamb":       ["lamb", "lamb mince", "lamb chops"],
  "bacon":           ["bacon"],
  "salmon":          ["salmon"],
  "white fish":      ["white fish", "cod", "haddock", "fish"],
  "prawns":          ["prawns", "shrimp"],
  "canned tuna":     ["canned tuna", "tuna"],
  "eggs":            ["eggs"],
  "tofu":            ["tofu"],
  "chickpeas":       ["chickpeas"],
  "lentils":         ["lentils", "red lentils"],
  "pasta":           ["pasta", "spaghetti", "penne", "fusilli"],
  "rice":            ["rice", "jasmine rice", "basmati"],
  "noodles":         ["noodles"],
  "potatoes":        ["potatoes"],
  "tortillas":       ["tortillas", "wraps", "flatbread"],
  "garlic":          ["garlic"],
  "onion":           ["onion", "onions"],
  "olive oil":       ["olive oil", "vegetable oil", "oil"],
  "butter":          ["butter"],
  "soy sauce":       ["soy sauce"],
  "sugar":           ["sugar"],
  "tomato paste":    ["tomato paste", "canned tomatoes", "passata"],
  "cumin":           ["cumin"],
  "chilli flakes":   ["chilli flakes", "chilli", "red pepper flakes"],
  "salt":            ["salt"],
  "pepper":          ["pepper", "black pepper"],
  "stock cubes":     ["stock cubes", "stock cube", "stock"],
  "vinegar":         ["vinegar"],
  "flour":           ["flour"],
};

function userHas(token: string, items: string[]): boolean {
  const options = SAT[token] ?? [token];
  return items.some(u =>
    options.some(o => u === o || u === o.toLowerCase())
  );
}

// ── Protein tokens ─────────────────────────────────────────────────────────

const PROTEIN_TOKENS = new Set([
  "chicken thighs", "chicken breast", "beef mince", "steak",
  "pork chops", "lamb", "bacon", "salmon", "white fish",
  "prawns", "canned tuna", "eggs", "tofu", "chickpeas", "lentils",
]);

function isProtein(token: string) { return PROTEIN_TOKENS.has(token); }

// ── Recipe library ─────────────────────────────────────────────────────────

const LIBRARY: Template[] = [
  {
    name: "Soy-glazed chicken thighs with garlic rice",
    cuisine: "Japanese", time_minutes: 30, difficulty: 2,
    tags: ["soy-based","asian","chicken","thighs","rice","sticky"],
    description: "Sticky soy-lacquered thighs over fragrant garlic rice.",
    image: "https://image.pollinations.ai/prompt/soy%20glazed%20chicken%20thighs%20garlic%20rice%20professional%20food%20photo?width=800&height=500&nologo=true&seed=1",
    reqs: [
      { token: "chicken thighs", label: "Chicken thighs", criticality: "essential" },
      { token: "rice",           label: "Rice",           criticality: "essential" },
      { token: "soy sauce",      label: "Soy sauce",      criticality: "essential" },
      { token: "garlic",         label: "Garlic",         criticality: "important", substitute: "1 tsp garlic powder" },
      { token: "olive oil",      label: "Olive oil",      criticality: "important", substitute: "any cooking oil" },
      { token: "sugar",          label: "Sugar",          criticality: "optional",  substitute: "skip — glaze less sticky" },
    ],
    ingredients: [
      { name: "Chicken thighs", quantity: "4 (approx 600g)" },
      { name: "Jasmine rice",   quantity: "1 cup" },
      { name: "Soy sauce",      quantity: "3 tbsp" },
      { name: "Garlic",         quantity: "4 cloves" },
      { name: "Olive oil",      quantity: "1 tbsp" },
      { name: "Sugar",          quantity: "1 tbsp" },
    ],
    steps: [
      { number: 1, instruction: "Measure 1 cup of rice. Rinse until water runs clear. Combine with 1¼ cups water and a pinch of salt, cover and bring to a boil.", timerMinutes: null },
      { number: 2, instruction: "Reduce to lowest heat, keep covered, cook until liquid is fully absorbed.", timerMinutes: 15 },
      { number: 3, instruction: "Pat the 4 chicken thighs completely dry. Season both sides with salt and pepper.", timerMinutes: null },
      { number: 4, instruction: "Heat 1 tbsp olive oil in a heavy pan over medium-high. Lay thighs skin-side down — immediate sizzle. Sear undisturbed until skin is deep golden.", timerMinutes: 6 },
      { number: 5, instruction: "Flip and cook the second side through.", timerMinutes: 5 },
      { number: 6, instruction: "Drain excess fat. Add 4 minced garlic cloves for 20 seconds, then pour in 3 tbsp soy sauce and 1 tbsp sugar. Bubble until syrupy and coat the chicken. Serve over the rice.", timerMinutes: null },
    ],
  },
  {
    name: "Chicken thigh and potato traybake",
    cuisine: "Mediterranean", time_minutes: 55, difficulty: 1,
    tags: ["roasted","mediterranean","chicken","thighs","potato","oven"],
    description: "Roasted chicken thighs and crispy potatoes with garlic.",
    image: "https://image.pollinations.ai/prompt/chicken%20traybake%20potatoes%20garlic%20mediterranean%20food%20photo?width=800&height=500&nologo=true&seed=2",
    reqs: [
      { token: "chicken thighs", label: "Chicken thighs", criticality: "essential" },
      { token: "potatoes",       label: "Potatoes",       criticality: "essential" },
      { token: "olive oil",      label: "Olive oil",      criticality: "essential" },
      { token: "garlic",         label: "Garlic",         criticality: "important", substitute: "1 tsp garlic powder" },
      { token: "salt",           label: "Salt",           criticality: "important", substitute: "season well" },
      { token: "pepper",         label: "Pepper",         criticality: "optional",  substitute: "skip" },
    ],
    ingredients: [
      { name: "Chicken thighs", quantity: "6, bone-in" },
      { name: "Potatoes",       quantity: "600g" },
      { name: "Garlic",         quantity: "1 whole head" },
      { name: "Olive oil",      quantity: "4 tbsp" },
      { name: "Salt",           quantity: "2 tsp" },
      { name: "Pepper",         quantity: "1 tsp" },
    ],
    steps: [
      { number: 1, instruction: "Heat oven to 220°C. Cut 600g potatoes into 3cm chunks.", timerMinutes: null },
      { number: 2, instruction: "Toss potatoes with 2 tbsp olive oil and 1 tsp salt in a roasting tray. Spread in a single layer.", timerMinutes: null },
      { number: 3, instruction: "Pat 6 chicken thighs dry. Rub with remaining 2 tbsp olive oil and season heavily. Nestle skin-side up among potatoes with a whole head of garlic in the centre.", timerMinutes: null },
      { number: 4, instruction: "Roast until potatoes start to colour.", timerMinutes: 25 },
      { number: 5, instruction: "Stir potatoes, leave chicken, continue roasting until skin is deep golden.", timerMinutes: 20 },
      { number: 6, instruction: "Rest 5 minutes. Squeeze soft roasted garlic over the chicken before serving.", timerMinutes: 5 },
    ],
  },
  {
    name: "Pan-fried chicken breast with garlic and lemon butter",
    cuisine: "Mediterranean", time_minutes: 25, difficulty: 2,
    tags: ["pan-fried","mediterranean","chicken","breast","butter"],
    description: "Juicy pan-seared chicken breast in golden garlic butter.",
    image: "https://image.pollinations.ai/prompt/pan%20fried%20chicken%20breast%20garlic%20butter%20lemon%20professional%20food%20photo?width=800&height=500&nologo=true&seed=20",
    reqs: [
      { token: "chicken breast", label: "Chicken breast", criticality: "essential" },
      { token: "butter",         label: "Butter",         criticality: "essential" },
      { token: "garlic",         label: "Garlic",         criticality: "important", substitute: "1 tsp garlic powder" },
      { token: "olive oil",      label: "Olive oil",      criticality: "important", substitute: "any cooking oil" },
      { token: "salt",           label: "Salt",           criticality: "important", substitute: "season well" },
      { token: "pepper",         label: "Pepper",         criticality: "optional",  substitute: "skip" },
    ],
    ingredients: [
      { name: "Chicken breasts", quantity: "2 (200g each)" },
      { name: "Butter",          quantity: "40g" },
      { name: "Garlic",          quantity: "4 cloves" },
      { name: "Olive oil",       quantity: "1 tbsp" },
      { name: "Salt",            quantity: "1 tsp" },
      { name: "Pepper",          quantity: "1 tsp" },
    ],
    steps: [
      { number: 1, instruction: "Slice 2 chicken breasts in half horizontally so they cook evenly — 4 thin pieces. Season all sides with 1 tsp salt and pepper.", timerMinutes: null },
      { number: 2, instruction: "Heat 1 tbsp olive oil in a wide pan over medium-high until shimmering. Lay the chicken flat — it should sizzle immediately.", timerMinutes: null },
      { number: 3, instruction: "Cook undisturbed until the underside is deep golden.", timerMinutes: 4 },
      { number: 4, instruction: "Flip and cook the second side until the chicken feels firm when pressed.", timerMinutes: 3 },
      { number: 5, instruction: "Add 40g butter and 4 smashed garlic cloves. As the butter foams, spoon it continuously over the chicken.", timerMinutes: 2 },
      { number: 6, instruction: "Rest 2 minutes. Pour the garlic butter over to serve.", timerMinutes: 2 },
    ],
  },
  {
    name: "Chicken breast soy stir fry",
    cuisine: "Asian", time_minutes: 20, difficulty: 1,
    tags: ["soy-based","asian","chicken","breast","stir-fry"],
    description: "Thinly sliced chicken breast in a sticky soy glaze.",
    image: "https://image.pollinations.ai/prompt/chicken%20breast%20soy%20stir%20fry%20asian%20professional%20food%20photo?width=800&height=500&nologo=true&seed=21",
    reqs: [
      { token: "chicken breast", label: "Chicken breast", criticality: "essential" },
      { token: "soy sauce",      label: "Soy sauce",      criticality: "essential" },
      { token: "garlic",         label: "Garlic",         criticality: "important", substitute: "1 tsp garlic powder" },
      { token: "olive oil",      label: "Olive oil",      criticality: "important", substitute: "any cooking oil" },
      { token: "sugar",          label: "Sugar",          criticality: "optional",  substitute: "skip" },
    ],
    ingredients: [
      { name: "Chicken breast", quantity: "2 fillets" },
      { name: "Soy sauce",      quantity: "3 tbsp" },
      { name: "Garlic",         quantity: "3 cloves" },
      { name: "Olive oil",      quantity: "1 tbsp" },
      { name: "Sugar",          quantity: "1 tsp" },
    ],
    steps: [
      { number: 1, instruction: "Slice 2 chicken breasts thinly across the grain — about 1cm thick strips. Mix 3 tbsp soy sauce with 1 tsp sugar.", timerMinutes: null },
      { number: 2, instruction: "Heat 1 tbsp oil in a wide pan over high heat until just smoking.", timerMinutes: null },
      { number: 3, instruction: "Add chicken strips in a single layer. Sear without moving.", timerMinutes: 2 },
      { number: 4, instruction: "Flip the strips. Add 3 minced garlic cloves and stir 30 seconds.", timerMinutes: null },
      { number: 5, instruction: "Pour the soy mixture around the edge of the pan. Toss quickly — it should bubble and coat the chicken immediately.", timerMinutes: 2 },
      { number: 6, instruction: "Serve immediately over rice if you have it. The glaze thickens as it cools.", timerMinutes: null },
    ],
  },
  {
    name: "Spiced tomato eggs (shakshuka)",
    cuisine: "Middle Eastern", time_minutes: 25, difficulty: 1,
    tags: ["tomato-based","middle-eastern","eggs","spiced","vegetarian"],
    description: "Eggs poached in a smoky cumin-spiced tomato sauce.",
    image: "https://image.pollinations.ai/prompt/shakshuka%20eggs%20tomato%20sauce%20professional%20food%20photo?width=800&height=500&nologo=true&seed=3",
    reqs: [
      { token: "eggs",          label: "Eggs",          criticality: "essential" },
      { token: "tomato paste",  label: "Tomato paste",  criticality: "essential" },
      { token: "onion",         label: "Onion",         criticality: "essential" },
      { token: "garlic",        label: "Garlic",        criticality: "important", substitute: "1 tsp garlic powder" },
      { token: "cumin",         label: "Cumin",         criticality: "important", substitute: "1 tsp smoked paprika" },
      { token: "olive oil",     label: "Olive oil",     criticality: "important", substitute: "any cooking oil" },
      { token: "chilli flakes", label: "Chilli flakes", criticality: "optional",  substitute: "skip for mild" },
    ],
    ingredients: [
      { name: "Eggs",          quantity: "4" },
      { name: "Tomato paste",  quantity: "3 tbsp" },
      { name: "Onion",         quantity: "1 large" },
      { name: "Garlic",        quantity: "3 cloves" },
      { name: "Cumin",         quantity: "1 tsp" },
      { name: "Chilli flakes", quantity: "½ tsp" },
      { name: "Olive oil",     quantity: "2 tbsp" },
    ],
    steps: [
      { number: 1, instruction: "Finely dice 1 large onion. Heat 2 tbsp olive oil in a wide pan over medium.", timerMinutes: null },
      { number: 2, instruction: "Cook onion with a pinch of salt until golden and sweet.", timerMinutes: 6 },
      { number: 3, instruction: "Stir in 3 minced garlic cloves, 1 tsp cumin and ½ tsp chilli flakes. Cook 30 seconds.", timerMinutes: null },
      { number: 4, instruction: "Add 3 tbsp tomato paste and 1 cup water. Stir into a sauce and simmer until slightly thickened.", timerMinutes: 6 },
      { number: 5, instruction: "Make 4 wells in the sauce. Crack 1 egg into each well. Cover.", timerMinutes: null },
      { number: 6, instruction: "Cook covered until whites are just set but yolks still wobble.", timerMinutes: 5 },
    ],
  },
  {
    name: "Egg fried rice",
    cuisine: "Chinese", time_minutes: 15, difficulty: 1,
    tags: ["soy-based","asian","eggs","rice","stir-fry","vegetarian"],
    description: "Wok-tossed rice with scrambled egg, soy and charred onion.",
    image: "https://image.pollinations.ai/prompt/egg%20fried%20rice%20chinese%20wok%20professional%20food%20photo?width=800&height=500&nologo=true&seed=4",
    reqs: [
      { token: "eggs",      label: "Eggs",      criticality: "essential" },
      { token: "rice",      label: "Rice",      criticality: "essential" },
      { token: "soy sauce", label: "Soy sauce", criticality: "essential" },
      { token: "onion",     label: "Onion",     criticality: "important", substitute: "3 spring onions" },
      { token: "garlic",    label: "Garlic",    criticality: "important", substitute: "1 tsp garlic powder" },
      { token: "olive oil", label: "Olive oil", criticality: "important", substitute: "any cooking oil" },
    ],
    ingredients: [
      { name: "Cooked rice", quantity: "3 cups (day-old is best)" },
      { name: "Eggs",        quantity: "3" },
      { name: "Soy sauce",   quantity: "2 tbsp" },
      { name: "Onion",       quantity: "1 small" },
      { name: "Garlic",      quantity: "3 cloves" },
      { name: "Olive oil",   quantity: "2 tbsp" },
    ],
    steps: [
      { number: 1, instruction: "Crack 3 eggs into a bowl and beat with a pinch of salt. Measure 3 cups cooked rice and break up any cold clumps. Finely dice 1 onion and mince 3 garlic cloves.", timerMinutes: null },
      { number: 2, instruction: "Heat 1 tbsp oil in a wide pan over medium-high. Scramble the eggs into soft curds. Tip onto a plate.", timerMinutes: null },
      { number: 3, instruction: "Add 1 tbsp more oil. Fry the onion until edges turn dark golden.", timerMinutes: 4 },
      { number: 4, instruction: "Add the garlic and stir 20 seconds. Tip in the 3 cups of rice and press flat against the pan.", timerMinutes: 2 },
      { number: 5, instruction: "Toss the rice for 2 more minutes — listen for a dry crisp sizzle.", timerMinutes: 2 },
      { number: 6, instruction: "Return eggs. Drizzle 2 tbsp soy sauce around the edge and toss until every grain glistens.", timerMinutes: null },
    ],
  },
  {
    name: "Garlic butter pasta",
    cuisine: "Italian", time_minutes: 15, difficulty: 1,
    tags: ["butter-based","italian","pasta","garlic","vegetarian"],
    description: "Silky pasta in glossy garlic butter with cracked pepper.",
    image: "https://image.pollinations.ai/prompt/garlic%20butter%20pasta%20italian%20professional%20food%20photo?width=800&height=500&nologo=true&seed=5",
    reqs: [
      { token: "pasta",   label: "Pasta",   criticality: "essential" },
      { token: "butter",  label: "Butter",  criticality: "essential" },
      { token: "garlic",  label: "Garlic",  criticality: "essential" },
      { token: "salt",    label: "Salt",    criticality: "important", substitute: "season the pasta water well" },
      { token: "pepper",  label: "Pepper",  criticality: "optional",  substitute: "skip" },
    ],
    ingredients: [
      { name: "Pasta",  quantity: "200g" },
      { name: "Butter", quantity: "60g" },
      { name: "Garlic", quantity: "5 cloves" },
      { name: "Salt",   quantity: "for water + seasoning" },
      { name: "Pepper", quantity: "freshly cracked" },
    ],
    steps: [
      { number: 1, instruction: "Bring a large pot of well-salted water to a rolling boil. Add 200g pasta.", timerMinutes: null },
      { number: 2, instruction: "Cook pasta 1 minute less than packet says.", timerMinutes: 8 },
      { number: 3, instruction: "Finely slice 5 garlic cloves. Melt 60g butter in a wide pan over low heat.", timerMinutes: null },
      { number: 4, instruction: "Add garlic and let it gently sizzle to pale gold — never brown.", timerMinutes: 3 },
      { number: 5, instruction: "Reserve a mug of pasta water. Drag pasta into the butter pan with tongs. Add a splash of pasta water and toss vigorously until glossy.", timerMinutes: null },
      { number: 6, instruction: "Finish with generous cracked pepper. Serve immediately in warm bowls.", timerMinutes: null },
    ],
  },
  {
    name: "Beef mince tacos",
    cuisine: "Mexican", time_minutes: 20, difficulty: 1,
    tags: ["spiced","mexican","beef","tacos","cumin"],
    description: "Cumin-spiced beef in warm charred tortillas.",
    image: "https://image.pollinations.ai/prompt/beef%20tacos%20cumin%20spiced%20mexican%20professional%20food%20photo?width=800&height=500&nologo=true&seed=6",
    reqs: [
      { token: "beef mince",    label: "Beef mince",    criticality: "essential" },
      { token: "tortillas",     label: "Tortillas",     criticality: "essential" },
      { token: "cumin",         label: "Cumin",         criticality: "important", substitute: "1 tsp smoked paprika" },
      { token: "onion",         label: "Onion",         criticality: "important", substitute: "shallots or spring onions" },
      { token: "garlic",        label: "Garlic",        criticality: "important", substitute: "1 tsp garlic powder" },
      { token: "chilli flakes", label: "Chilli flakes", criticality: "optional",  substitute: "skip for mild" },
    ],
    ingredients: [
      { name: "Beef mince",    quantity: "400g" },
      { name: "Tortillas",     quantity: "8 small" },
      { name: "Onion",         quantity: "1" },
      { name: "Garlic",        quantity: "3 cloves" },
      { name: "Cumin",         quantity: "1 tbsp" },
      { name: "Chilli flakes", quantity: "1 tsp" },
    ],
    steps: [
      { number: 1, instruction: "Finely dice 1 onion and mince 3 garlic cloves.", timerMinutes: null },
      { number: 2, instruction: "Heat a dry pan over high. Add 400g beef mince in one layer and sear undisturbed until deeply browned on the underside.", timerMinutes: 4 },
      { number: 3, instruction: "Break mince apart and stir in the onion. Cook until onion softens.", timerMinutes: 5 },
      { number: 4, instruction: "Add garlic, 1 tbsp cumin and 1 tsp chilli flakes. Stir until toasty.", timerMinutes: 2 },
      { number: 5, instruction: "Splash in 3 tbsp water and let it bubble down to glaze the meat.", timerMinutes: 2 },
      { number: 6, instruction: "Char the tortillas directly over a flame or dry pan for 10 seconds each side. Fill and fold.", timerMinutes: null },
    ],
  },
  {
    name: "Salmon with soy glaze",
    cuisine: "Asian", time_minutes: 15, difficulty: 2,
    tags: ["soy-based","asian","salmon","fish","glazed"],
    description: "Crisp-skinned salmon lacquered in a sweet soy glaze.",
    image: "https://image.pollinations.ai/prompt/salmon%20soy%20glaze%20crispy%20skin%20asian%20professional%20food%20photo?width=800&height=500&nologo=true&seed=7",
    reqs: [
      { token: "salmon",    label: "Salmon",    criticality: "essential" },
      { token: "soy sauce", label: "Soy sauce", criticality: "essential" },
      { token: "garlic",    label: "Garlic",    criticality: "important", substitute: "1 tsp garlic powder" },
      { token: "olive oil", label: "Olive oil", criticality: "important", substitute: "any cooking oil" },
      { token: "sugar",     label: "Sugar",     criticality: "optional",  substitute: "skip — glaze less sweet" },
    ],
    ingredients: [
      { name: "Salmon fillets", quantity: "2 (150g each)" },
      { name: "Soy sauce",      quantity: "3 tbsp" },
      { name: "Garlic",         quantity: "3 cloves" },
      { name: "Olive oil",      quantity: "1 tbsp" },
      { name: "Sugar",          quantity: "1 tbsp" },
    ],
    steps: [
      { number: 1, instruction: "Pat 2 salmon fillets completely dry. Season the skin with salt.", timerMinutes: null },
      { number: 2, instruction: "Mince 3 garlic cloves. Mix 3 tbsp soy sauce and 1 tbsp sugar until sugar dissolves.", timerMinutes: null },
      { number: 3, instruction: "Heat 1 tbsp oil in a non-stick pan over medium-high. Lay salmon skin-side down and press flat for 10 seconds.", timerMinutes: null },
      { number: 4, instruction: "Cook undisturbed until flesh turns opaque two-thirds up the side.", timerMinutes: 4 },
      { number: 5, instruction: "Flip. Add garlic to the pan and cook briefly until fragrant.", timerMinutes: 2 },
      { number: 6, instruction: "Pour in the soy mixture and baste continuously until a thick glaze forms. Plate skin-side up.", timerMinutes: 2 },
    ],
  },
  {
    name: "Bacon and egg pasta",
    cuisine: "Italian", time_minutes: 20, difficulty: 2,
    tags: ["creamy","italian","pasta","bacon","eggs"],
    description: "Crisp bacon and silky egg-coated pasta with cracked pepper.",
    image: "https://image.pollinations.ai/prompt/bacon%20egg%20pasta%20carbonara%20italian%20professional%20food%20photo?width=800&height=500&nologo=true&seed=8",
    reqs: [
      { token: "bacon",   label: "Bacon",   criticality: "essential" },
      { token: "eggs",    label: "Eggs",    criticality: "essential" },
      { token: "pasta",   label: "Pasta",   criticality: "essential" },
      { token: "pepper",  label: "Pepper",  criticality: "important", substitute: "use as much as you have — pepper is key here" },
      { token: "salt",    label: "Salt",    criticality: "important", substitute: "salt the pasta water heavily" },
      { token: "garlic",  label: "Garlic",  criticality: "optional",  substitute: "skip — traditional carbonara doesn't use garlic" },
    ],
    ingredients: [
      { name: "Bacon",  quantity: "150g" },
      { name: "Eggs",   quantity: "3" },
      { name: "Pasta",  quantity: "200g" },
      { name: "Pepper", quantity: "freshly cracked, generously" },
      { name: "Salt",   quantity: "for the pasta water" },
      { name: "Garlic", quantity: "2 cloves (optional)" },
    ],
    steps: [
      { number: 1, instruction: "Bring a large pot of well-salted water to a rolling boil.", timerMinutes: null },
      { number: 2, instruction: "Slice 150g bacon into 1cm strips. Start in a cold pan over medium — fat renders slowly and bacon turns crisp.", timerMinutes: 7 },
      { number: 3, instruction: "Add 200g pasta to boiling water. Cook 1 minute less than the packet says.", timerMinutes: 9 },
      { number: 4, instruction: "Beat 3 eggs with lots of cracked pepper. Optional: smash a garlic clove into the bacon fat for 30 seconds, then discard.", timerMinutes: null },
      { number: 5, instruction: "Reserve a mug of pasta water. Drain pasta and tip into the bacon pan off the heat. Toss to coat.", timerMinutes: null },
      { number: 6, instruction: "Pour beaten eggs over pasta with a splash of pasta water. Toss vigorously — residual heat makes a glossy sauce. Serve immediately.", timerMinutes: null },
    ],
  },
  {
    name: "Spiced chickpea curry",
    cuisine: "Indian", time_minutes: 30, difficulty: 1,
    tags: ["tomato-based","indian","chickpeas","curry","vegetarian","spiced"],
    description: "Tomato-rich chickpeas with cumin warmth.",
    image: "https://image.pollinations.ai/prompt/chickpea%20curry%20indian%20spiced%20tomato%20professional%20food%20photo?width=800&height=500&nologo=true&seed=9",
    reqs: [
      { token: "chickpeas",     label: "Chickpeas",     criticality: "essential" },
      { token: "tomato paste",  label: "Tomato paste",  criticality: "essential" },
      { token: "onion",         label: "Onion",         criticality: "essential" },
      { token: "cumin",         label: "Cumin",         criticality: "important", substitute: "1 tsp curry powder" },
      { token: "garlic",        label: "Garlic",        criticality: "important", substitute: "1 tsp garlic powder" },
      { token: "stock cubes",   label: "Stock cubes",   criticality: "important", substitute: "water + extra salt" },
      { token: "olive oil",     label: "Olive oil",     criticality: "optional",  substitute: "any oil" },
      { token: "chilli flakes", label: "Chilli flakes", criticality: "optional",  substitute: "skip for mild" },
    ],
    ingredients: [
      { name: "Chickpeas",     quantity: "2 tins (480g drained)" },
      { name: "Onion",         quantity: "1 large" },
      { name: "Garlic",        quantity: "4 cloves" },
      { name: "Tomato paste",  quantity: "3 tbsp" },
      { name: "Cumin",         quantity: "2 tsp" },
      { name: "Chilli flakes", quantity: "1 tsp" },
      { name: "Olive oil",     quantity: "2 tbsp" },
      { name: "Stock cubes",   quantity: "1" },
    ],
    steps: [
      { number: 1, instruction: "Finely dice 1 large onion and mince 4 garlic cloves. Drain and rinse the chickpeas.", timerMinutes: null },
      { number: 2, instruction: "Heat 2 tbsp olive oil in a wide pan over medium. Sauté onion with a pinch of salt until deeply golden.", timerMinutes: 8 },
      { number: 3, instruction: "Stir in garlic, 2 tsp cumin and 1 tsp chilli flakes for 30 seconds, then add 3 tbsp tomato paste and cook until it darkens.", timerMinutes: 3 },
      { number: 4, instruction: "Add chickpeas, 1 crumbled stock cube and 1 cup water. Stir to coat.", timerMinutes: null },
      { number: 5, instruction: "Simmer uncovered, mashing some chickpeas, until sauce clings.", timerMinutes: 12 },
      { number: 6, instruction: "Taste and adjust salt. Rest 2 minutes — flavours sharpen.", timerMinutes: 2 },
    ],
  },
  {
    name: "Lentil soup",
    cuisine: "Mediterranean", time_minutes: 40, difficulty: 1,
    tags: ["tomato-based","mediterranean","lentils","soup","vegetarian"],
    description: "Hearty lentil and tomato soup with warming cumin.",
    image: "https://image.pollinations.ai/prompt/lentil%20soup%20mediterranean%20cumin%20professional%20food%20photo?width=800&height=500&nologo=true&seed=10",
    reqs: [
      { token: "lentils",      label: "Lentils",      criticality: "essential" },
      { token: "onion",        label: "Onion",        criticality: "essential" },
      { token: "stock cubes",  label: "Stock cubes",  criticality: "important", substitute: "water + 1 tsp soy sauce + salt" },
      { token: "cumin",        label: "Cumin",        criticality: "important", substitute: "1 tsp coriander powder" },
      { token: "tomato paste", label: "Tomato paste", criticality: "important", substitute: "skip — soup paler but still filling" },
      { token: "garlic",       label: "Garlic",       criticality: "important", substitute: "1 tsp garlic powder" },
      { token: "olive oil",    label: "Olive oil",    criticality: "optional",  substitute: "any oil" },
    ],
    ingredients: [
      { name: "Red lentils",  quantity: "1 cup" },
      { name: "Onion",        quantity: "1 large" },
      { name: "Garlic",       quantity: "4 cloves" },
      { name: "Cumin",        quantity: "2 tsp" },
      { name: "Tomato paste", quantity: "2 tbsp" },
      { name: "Stock cubes",  quantity: "2" },
      { name: "Olive oil",    quantity: "2 tbsp" },
    ],
    steps: [
      { number: 1, instruction: "Dice 1 large onion and mince 4 garlic cloves. Rinse 1 cup lentils until water runs mostly clear.", timerMinutes: null },
      { number: 2, instruction: "Heat 2 tbsp olive oil in a large pot over medium. Sweat onion with a pinch of salt until translucent.", timerMinutes: 7 },
      { number: 3, instruction: "Add garlic and 2 tsp cumin for 30 seconds, then 2 tbsp tomato paste. Cook until it darkens.", timerMinutes: 2 },
      { number: 4, instruction: "Add the lentils, 2 crumbled stock cubes and 5 cups water. Bring to a brisk boil.", timerMinutes: null },
      { number: 5, instruction: "Reduce to a gentle simmer until lentils collapse into the broth.", timerMinutes: 25 },
      { number: 6, instruction: "Mash lightly with a spoon for body. Taste and adjust salt.", timerMinutes: null },
    ],
  },
  {
    name: "Potato and onion hash with eggs",
    cuisine: "American", time_minutes: 30, difficulty: 1,
    tags: ["pan-fried","american","potato","eggs","hash","vegetarian"],
    description: "Crisp golden potatoes, sweet onion and runny eggs.",
    image: "https://image.pollinations.ai/prompt/potato%20onion%20hash%20eggs%20breakfast%20professional%20food%20photo?width=800&height=500&nologo=true&seed=11",
    reqs: [
      { token: "potatoes", label: "Potatoes", criticality: "essential" },
      { token: "onion",    label: "Onion",    criticality: "essential" },
      { token: "eggs",     label: "Eggs",     criticality: "essential" },
      { token: "butter",   label: "Butter",   criticality: "important", substitute: "olive oil or any cooking oil" },
      { token: "salt",     label: "Salt",     criticality: "important", substitute: "season well" },
      { token: "pepper",   label: "Pepper",   criticality: "optional",  substitute: "skip" },
    ],
    ingredients: [
      { name: "Potatoes", quantity: "500g" },
      { name: "Onion",    quantity: "1 large" },
      { name: "Eggs",     quantity: "4" },
      { name: "Butter",   quantity: "40g" },
      { name: "Salt",     quantity: "1 tsp" },
      { name: "Pepper",   quantity: "1 tsp" },
    ],
    steps: [
      { number: 1, instruction: "Cut 500g potatoes into 1cm cubes. Slice 1 large onion thinly.", timerMinutes: null },
      { number: 2, instruction: "Melt 20g butter in a wide heavy pan over medium. Add potatoes in a single layer with 1 tsp salt. Don't touch them.", timerMinutes: null },
      { number: 3, instruction: "Cook undisturbed until the underside is deep golden and crisp.", timerMinutes: 8 },
      { number: 4, instruction: "Stir in the onion and remaining 20g butter. Cook, turning occasionally, until potatoes are tender and onion caramelised.", timerMinutes: 10 },
      { number: 5, instruction: "Make 4 wells. Crack 1 egg into each. Season yolks. Cover the pan.", timerMinutes: null },
      { number: 6, instruction: "Cook covered until whites are just set but yolks still wobble.", timerMinutes: 4 },
    ],
  },
  {
    name: "Pan-seared steak with garlic butter",
    cuisine: "American", time_minutes: 20, difficulty: 2,
    tags: ["pan-fried","american","steak","beef","butter","garlic"],
    description: "Deeply seared steak rested in foaming garlic butter.",
    image: "https://image.pollinations.ai/prompt/pan%20seared%20steak%20garlic%20butter%20professional%20food%20photo?width=800&height=500&nologo=true&seed=30",
    reqs: [
      { token: "steak",     label: "Steak",     criticality: "essential" },
      { token: "butter",    label: "Butter",    criticality: "essential" },
      { token: "garlic",    label: "Garlic",    criticality: "important", substitute: "1 tsp garlic powder" },
      { token: "olive oil", label: "Olive oil", criticality: "important", substitute: "any high-smoke-point oil" },
      { token: "salt",      label: "Salt",      criticality: "important", substitute: "season heavily" },
      { token: "pepper",    label: "Pepper",    criticality: "important", substitute: "use as much as you have" },
    ],
    ingredients: [
      { name: "Steak",     quantity: "2 (200g each, at least 2cm thick)" },
      { name: "Butter",    quantity: "40g" },
      { name: "Garlic",    quantity: "4 cloves, smashed" },
      { name: "Olive oil", quantity: "1 tbsp" },
      { name: "Salt",      quantity: "2 tsp" },
      { name: "Pepper",    quantity: "1 tsp cracked" },
    ],
    steps: [
      { number: 1, instruction: "Take the 2 steaks out of the fridge 30 minutes before cooking. Pat completely dry — moisture kills the sear. Season every surface heavily with salt and cracked pepper.", timerMinutes: null },
      { number: 2, instruction: "Heat 1 tbsp olive oil in a heavy pan over highest heat until you see the first wisps of smoke.", timerMinutes: null },
      { number: 3, instruction: "Lay the steaks flat — violent sizzle immediately. Don't move them.", timerMinutes: null },
      { number: 4, instruction: "Sear undisturbed until a deep mahogany crust forms underneath.", timerMinutes: 3 },
      { number: 5, instruction: "Flip once. Add 40g butter and 4 smashed garlic cloves. As the butter foams, tilt the pan and spoon it continuously over the steaks.", timerMinutes: 2 },
      { number: 6, instruction: "Rest the steaks on a board for 5 full minutes. Slice against the grain. Pour the garlic butter over the top.", timerMinutes: 5 },
    ],
  },
  {
    name: "Spiced lamb with rice",
    cuisine: "Middle Eastern", time_minutes: 40, difficulty: 2,
    tags: ["spiced","middle-eastern","lamb","rice","cumin"],
    description: "Aromatic cumin-spiced lamb over fragrant steamed rice.",
    image: "https://image.pollinations.ai/prompt/spiced%20lamb%20mince%20rice%20middle%20eastern%20food%20photo?width=800&height=500&nologo=true&seed=31",
    reqs: [
      { token: "lamb",         label: "Lamb",         criticality: "essential" },
      { token: "rice",         label: "Rice",         criticality: "essential" },
      { token: "onion",        label: "Onion",        criticality: "essential" },
      { token: "cumin",        label: "Cumin",        criticality: "important", substitute: "1 tsp mixed spice" },
      { token: "garlic",       label: "Garlic",       criticality: "important", substitute: "1 tsp garlic powder" },
      { token: "tomato paste", label: "Tomato paste", criticality: "optional",  substitute: "skip — lamb is rich enough" },
      { token: "olive oil",    label: "Olive oil",    criticality: "optional",  substitute: "any oil" },
    ],
    ingredients: [
      { name: "Lamb",         quantity: "400g, minced or diced" },
      { name: "Rice",         quantity: "1 cup" },
      { name: "Onion",        quantity: "1 large" },
      { name: "Garlic",       quantity: "3 cloves" },
      { name: "Cumin",        quantity: "2 tsp" },
      { name: "Tomato paste", quantity: "1 tbsp" },
      { name: "Olive oil",    quantity: "1 tbsp" },
    ],
    steps: [
      { number: 1, instruction: "Rinse 1 cup rice. Cook with 1¼ cups water and a pinch of salt — bring to boil, cover, lowest heat.", timerMinutes: 15 },
      { number: 2, instruction: "Finely dice 1 large onion and mince 3 garlic cloves.", timerMinutes: null },
      { number: 3, instruction: "Heat 1 tbsp olive oil over medium-high. Add 400g lamb in a single layer — don't stir for 3 minutes so it gets colour.", timerMinutes: 3 },
      { number: 4, instruction: "Break the lamb apart and add the onion. Cook until the onion softens.", timerMinutes: 5 },
      { number: 5, instruction: "Add garlic, 2 tsp cumin and 1 tbsp tomato paste. Stir until paste darkens and smells toasty.", timerMinutes: 2 },
      { number: 6, instruction: "Season with salt. Serve the spiced lamb over rice with the juices spooned over.", timerMinutes: null },
    ],
  },
  {
    name: "Pork chops with garlic butter",
    cuisine: "European", time_minutes: 25, difficulty: 2,
    tags: ["pan-fried","european","pork","garlic","butter"],
    description: "Juicy pan-fried pork chops basted in foaming garlic butter.",
    image: "https://image.pollinations.ai/prompt/pork%20chops%20garlic%20butter%20pan%20seared%20professional%20food%20photo?width=800&height=500&nologo=true&seed=32",
    reqs: [
      { token: "pork chops", label: "Pork chops", criticality: "essential" },
      { token: "butter",     label: "Butter",     criticality: "important", substitute: "olive oil — less rich but works" },
      { token: "garlic",     label: "Garlic",     criticality: "important", substitute: "1 tsp garlic powder" },
      { token: "olive oil",  label: "Olive oil",  criticality: "important", substitute: "any cooking oil" },
      { token: "salt",       label: "Salt",       criticality: "important", substitute: "season well" },
      { token: "pepper",     label: "Pepper",     criticality: "optional",  substitute: "skip" },
    ],
    ingredients: [
      { name: "Pork chops", quantity: "2 (200g each)" },
      { name: "Butter",     quantity: "30g" },
      { name: "Garlic",     quantity: "4 cloves, smashed" },
      { name: "Olive oil",  quantity: "1 tbsp" },
      { name: "Salt",       quantity: "1 tsp" },
      { name: "Pepper",     quantity: "1 tsp" },
    ],
    steps: [
      { number: 1, instruction: "Pat the 2 pork chops completely dry. Season both sides with 1 tsp salt and pepper.", timerMinutes: null },
      { number: 2, instruction: "Heat 1 tbsp olive oil in a heavy pan over medium-high until shimmering.", timerMinutes: null },
      { number: 3, instruction: "Lay the chops flat. Sear without touching.", timerMinutes: 4 },
      { number: 4, instruction: "Flip. Add 30g butter and 4 smashed garlic cloves. Baste continuously as the butter foams.", timerMinutes: 3 },
      { number: 5, instruction: "Stand the chops on their fat edge and press down to render the fat until golden.", timerMinutes: 2 },
      { number: 6, instruction: "Rest 3 minutes before serving. Pour the garlic butter over the top.", timerMinutes: 3 },
    ],
  },
];
// ── Novelty Engine ─────────────────────────────────────────────────────────
// Applies recency penalties so the app never suggests the same meal twice
// in a short window. The more a user cooks, the better suggestions get.

export type CookHistory = {
  name: string;
  cuisine: string;
  rating: "loved" | "good" | "skip";
  ts: number;
}[];

function noveltyMultiplier(template: Template, history: CookHistory): number {
  if (!history || history.length === 0) return 1.0;

  const now = Date.now();
  const DAY = 86400000;

  for (const entry of history) {
    const daysAgo = (now - entry.ts) / DAY;

    // Exact same recipe cooked recently
    if (entry.name === template.name) {
      if (daysAgo < 7)  return 0.05; // Almost never — cooked within a week
      if (daysAgo < 14) return 0.3;  // Strongly deprioritise within 2 weeks
      if (daysAgo < 30) return 0.6;  // Soft penalty within a month
    }

    // Same cuisine + same protein within last 5 days — too similar
    const entryTags = history
      .filter(h => h.name === entry.name)
      .flatMap(() => template.tags ?? []);

    const sameCuisineRecent = entry.cuisine === template.cuisine && daysAgo < 5;
    if (sameCuisineRecent) return Math.min(1.0, 0.5 + (daysAgo / 10));

    // Skipped recipe — don't show again for 30 days
    if (entry.name === template.name && entry.rating === "skip" && daysAgo < 30) {
      return 0.02;
    }

    // Loved recipe — boost it slightly after 14 days (bring it back)
    if (entry.name === template.name && entry.rating === "loved" && daysAgo > 14) {
      return 1.3; // Slight boost — user wants it again
    }
  }

  return 1.0;
}

// ── Scoring ─────────────────────────────────────────────────────────────────

type Match = {
  template: Template;
  score: number;
  viable: boolean;
  swaps: { ingredient: string; swap: string }[];
  optional: string[];
};

function collectItems(inventory: Inventory): string[] {
  return [
    ...inventory.staples,
    ...inventory.proteins,
    ...inventory.carbs,
    ...inventory.vegetables,
    ...inventory.fridge,
  ].map(s => s.toLowerCase().trim());
}

function scoreTemplate(t: Template, items: string[]): Match {
  let viable = true;
  const swaps: { ingredient: string; swap: string }[] = [];
  const optional: string[] = [];
  let missingWeight = 0;

  for (const req of t.reqs) {
    if (userHas(req.token, items)) continue;

    if (req.criticality === "essential") {
      viable = false;
      missingWeight += 2;
    } else if (req.criticality === "important") {
      missingWeight += 1;
      if (req.substitute) {
        swaps.push({ ingredient: req.label, swap: req.substitute });
      }
    } else {
      optional.push(req.label);
    }
  }

  const totalWeight = t.reqs.reduce((acc, r) =>
    acc + (r.criticality === "essential" ? 2 : r.criticality === "important" ? 1 : 0.5), 0
  );
  const score = viable ? Math.max(0.1, (totalWeight - missingWeight) / totalWeight) : 0;

  return { template: t, score, viable, swaps, optional };
}

// ── Match result ────────────────────────────────────────────────────────────

export type MatchResult =
  | { ok: true;  matches: Match[]; sparse: boolean }
  | { ok: false; reason: "no_protein_match" | "no_ingredients" | "no_match"; detail: string };

export function findRecipes(inventory: Inventory, history: CookHistory = []): MatchResult {
  const items = collectItems(inventory);
  const hasProtein = inventory.proteins.length > 0;

  if (items.length < 3) {
    return { ok: false, reason: "no_ingredients", detail: "Add some proteins, carbs or vegetables to your kitchen first." };
  }

  const all = LIBRARY
    .map(t => {
      const base = scoreTemplate(t, items);
      // Apply novelty multiplier — personalises score based on cooking history
      const novelty = noveltyMultiplier(t, history);
      return { ...base, score: base.score * novelty };
    })
    .sort((a, b) => b.score - a.score);
  const viable = all.filter(m => m.viable);

  if (hasProtein) {
    const userProteins = inventory.proteins.map(p => p.toLowerCase().trim());

    // Recipes where an essential ingredient is a protein the user has
    const withUserProtein = viable.filter(m =>
      m.template.reqs.some(r =>
        r.criticality === "essential" &&
        isProtein(r.token) &&
        userProteins.some(up => userHas(r.token, [up]))
      )
    );

    if (withUserProtein.length > 0) {
      return { ok: true, matches: withUserProtein.slice(0, 5), sparse: false };
    }

    // Protein selected but no viable match — check if any recipe at all uses it
    const anyWithProtein = all.filter(m =>
      m.template.reqs.some(r =>
        r.criticality === "essential" &&
        isProtein(r.token) &&
        userProteins.some(up => userHas(r.token, [up]))
      )
    );

    if (anyWithProtein.length > 0) {
      // Recipe exists but missing other essentials — show sparse
      return { ok: true, matches: anyWithProtein.slice(0, 3), sparse: true };
    }

    return {
      ok: false,
      reason: "no_protein_match",
      detail: `No recipes found for ${inventory.proteins.join(", ")}. Try selecting a different protein or adding more ingredients.`,
    };
  }

  // No protein — show best viable matches
  if (viable.length > 0) return { ok: true, matches: viable.slice(0, 5), sparse: false };
  if (all.length > 0) return { ok: true, matches: all.slice(0, 3), sparse: true };

  return { ok: false, reason: "no_match", detail: "No recipes matched your kitchen. Try adding more ingredients." };
}

// ── Build recipe from match ────────────────────────────────────────────────

let rerollIdx = 0;

function buildRecipe(m: Match, session: SessionPayload, sparse: boolean): Recipe {
  const t = m.template;
  const ingredients: RecipeIngredient[] = t.ingredients.map(ing => {
    const tokenGuess = ing.name.toLowerCase().replace(/\s*\(.*\)/, "").trim();
    const req = t.reqs.find(r => r.token === tokenGuess || r.label.toLowerCase() === ing.name.toLowerCase());
    const inInventory = req ? userHas(req.token, collectItems({ staples: [], proteins: [], carbs: [], vegetables: [], fridge: [], appliances: [], lastUpdated: null })) : true;
    return {
      name: ing.name,
      quantity: ing.quantity,
      inInventory: req === undefined || m.swaps.some(s => s.ingredient === req.label) ? false : true,
      substituteNote: m.swaps.find(s => s.ingredient === req?.label)?.swap ?? null,
      criticality: req?.criticality,
    };
  });

  const matchLabel = m.swaps.length === 0 && m.optional.length === 0
    ? "Perfect match"
    : m.swaps.length > 0
      ? `${m.swaps.length} swap${m.swaps.length > 1 ? "s" : ""} needed`
      : "Works without missing items";

  return {
    name: t.name,
    cuisine: t.cuisine,
    description: t.description,
    time_minutes: t.time_minutes,
    difficulty: t.difficulty,
    servings: session.servings,
    ingredients,
    steps: t.steps,
    image: t.image,
    matchLabel,
    matchPercent: m.score,
    requiredSwaps: m.swaps,
    optionalMissing: m.optional,
    sparseFallback: sparse,
  };
}

// ── Public API ─────────────────────────────────────────────────────────────

export function getRecipe(inventory: Inventory, session: SessionPayload, history: CookHistory = []): Recipe {
  const result = findRecipes(inventory, history);
  if (!result.ok) throw new Error(`${result.reason}|${result.detail}`);
  const { matches, sparse } = result;
  const pick = matches[rerollIdx % matches.length];
  rerollIdx++;
  return buildRecipe(pick, session, sparse);
}

export async function getRecipeFromAPI(inventory: Inventory, session: SessionPayload, signal?: AbortSignal): Promise<Recipe> {
  const res = await fetch("/api/generate-recipe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inventory, session }),
    signal,
  });
  if (!res.ok) throw new Error("api_failed");
  const data = await res.json();
  if (data.error || !data.name || !data.steps) throw new Error("api_failed");
  return data as Recipe;
}

// Legacy exports for any existing imports
export class RecipeError extends Error {
  constructor(public readonly reason: string = "unknown") {
    super("No recipe found");
    this.name = "RecipeError";
  }
}
export const RECIPE_ERROR_MESSAGE = "No recipe found for your ingredients.";
export const requestRecipe = (inventory: Inventory, session: SessionPayload) => Promise.resolve(getRecipe(inventory, session));
export const requestRecipeFromAPI = getRecipeFromAPI;