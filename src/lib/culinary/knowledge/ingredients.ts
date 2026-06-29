// Curated ingredient knowledge — the "retrieval source" for ingredient
// function. Grounded in the app's fixed pantry (see src/lib/mise-data.ts) plus
// a few classics, so classification is deterministic and complete for real
// inputs. Each entry: canonical roles (primary first), flavour notes, the
// cuisines it's at home in, and aliases the normalizer should fold in.

import type { Role } from "../types";

export type IngredientEntry = {
  display: string;
  roles: Role[];
  notes?: string[];
  cuisines?: string[];
  aliases?: string[];
};

export const INGREDIENTS: Record<string, IngredientEntry> = {
  // ── Proteins ──────────────────────────────────────────────────────────
  chicken: { display: "Chicken", roles: ["protein"], notes: ["lean", "mild"],
    cuisines: ["Italian", "Indian", "Mexican", "Chinese", "Thai", "Mediterranean", "American"],
    aliases: ["chicken breast", "chicken breasts", "chicken thigh", "chicken thighs", "chicken legs", "chicken wings", "chicken mince"] },
  beef: { display: "Beef", roles: ["protein"], notes: ["rich", "umami"],
    cuisines: ["Italian", "Mexican", "Chinese", "American", "French"],
    aliases: ["beef mince", "minced beef", "ground beef", "steak", "beef diced", "beef diced / steak", "diced beef"] },
  pork: { display: "Pork", roles: ["protein"], notes: ["rich"],
    cuisines: ["Chinese", "Italian", "American", "Thai"],
    aliases: ["pork mince", "pork diced", "pork chops", "pork chop", "pork belly", "minced pork"] },
  lamb: { display: "Lamb", roles: ["protein"], notes: ["rich", "gamey"],
    cuisines: ["Indian", "Middle Eastern", "Mediterranean"],
    aliases: ["lamb mince", "lamb diced", "lamb chops", "minced lamb"] },
  bacon: { display: "Bacon", roles: ["protein", "fat"], notes: ["smoky", "salty", "umami"],
    cuisines: ["Italian", "American", "French", "British"], aliases: ["pancetta"] },
  sausages: { display: "Sausages", roles: ["protein", "fat"], notes: ["savoury", "fatty"],
    cuisines: ["Italian", "American", "British"], aliases: ["sausage"] },
  salmon: { display: "Salmon", roles: ["protein"], notes: ["oily", "rich"],
    cuisines: ["Japanese", "Thai", "Mediterranean", "American"] },
  "white fish": { display: "White fish", roles: ["protein"], notes: ["mild", "delicate"],
    cuisines: ["Mediterranean", "Thai", "British"], aliases: ["cod", "haddock", "fish"] },
  "oily fish": { display: "Oily fish", roles: ["protein"], notes: ["oily", "rich"], cuisines: ["Mediterranean"] },
  "smoked salmon": { display: "Smoked salmon", roles: ["protein", "garnish"], notes: ["smoky", "salty"], cuisines: ["British"] },
  prawns: { display: "Prawns", roles: ["protein"], notes: ["sweet", "delicate"],
    cuisines: ["Thai", "Chinese", "Mediterranean"], aliases: ["shrimp", "prawn"] },
  tuna: { display: "Canned tuna", roles: ["protein"], notes: ["savoury"], cuisines: ["Italian", "Mediterranean"], aliases: ["canned tuna", "tinned tuna"] },
  eggs: { display: "Eggs", roles: ["protein", "fat"], notes: ["rich", "binding", "versatile"],
    cuisines: ["Italian", "Chinese", "French", "Indian"], aliases: ["egg"] },
  tofu: { display: "Tofu", roles: ["protein"], notes: ["mild", "absorbs flavour"], cuisines: ["Chinese", "Thai", "Japanese"] },
  chickpeas: { display: "Chickpeas", roles: ["protein", "base"], notes: ["nutty", "hearty"],
    cuisines: ["Indian", "Middle Eastern", "Mediterranean"], aliases: ["chickpea", "garbanzo"] },
  lentils: { display: "Lentils", roles: ["protein", "base"], notes: ["earthy", "hearty"],
    cuisines: ["Indian", "Mediterranean", "Middle Eastern"], aliases: ["lentil", "dal", "daal"] },

  // ── Bases / carbs ─────────────────────────────────────────────────────
  pasta: { display: "Pasta", roles: ["base"], notes: ["starchy"], cuisines: ["Italian"],
    aliases: ["spaghetti", "penne", "linguine", "tagliatelle", "macaroni"] },
  rice: { display: "Rice", roles: ["base"], notes: ["starchy", "neutral"],
    cuisines: ["Indian", "Chinese", "Thai", "Japanese", "Mediterranean"], aliases: ["basmati", "jasmine rice", "pilaf", "pilau"] },
  noodles: { display: "Noodles", roles: ["base"], notes: ["starchy"], cuisines: ["Chinese", "Thai", "Japanese"], aliases: ["noodle", "ramen", "udon"] },
  couscous: { display: "Couscous", roles: ["base"], notes: ["starchy", "light"], cuisines: ["Middle Eastern", "Mediterranean"] },
  potatoes: { display: "Potatoes", roles: ["base", "veg"], notes: ["starchy", "hearty"],
    cuisines: ["French", "American", "British", "Indian"], aliases: ["potato", "new potatoes"] },
  bread: { display: "Bread", roles: ["base", "crunch"], notes: ["starchy"], cuisines: ["Mediterranean", "American"], aliases: ["toast", "baguette"] },
  tortillas: { display: "Tortillas", roles: ["base"], notes: ["starchy"], cuisines: ["Mexican"], aliases: ["tortilla", "wrap"] },

  // ── Vegetables ────────────────────────────────────────────────────────
  tomatoes: { display: "Tomatoes", roles: ["veg", "acid"], notes: ["umami", "sweet-acidic", "juicy"],
    cuisines: ["Italian", "Mediterranean", "Mexican", "Indian"], aliases: ["tomato", "cherry tomatoes", "canned tomatoes", "chopped tomatoes"] },
  peppers: { display: "Peppers", roles: ["veg"], notes: ["sweet", "fresh"],
    cuisines: ["Mediterranean", "Mexican", "Chinese"], aliases: ["pepper", "bell pepper", "bell peppers", "capsicum", "red pepper"] },
  spinach: { display: "Spinach", roles: ["veg"], notes: ["fresh", "mild", "earthy"], cuisines: ["Indian", "Italian", "Mediterranean"] },
  broccoli: { display: "Broccoli", roles: ["veg", "crunch"], notes: ["fresh", "green"], cuisines: ["Chinese", "Italian", "American"] },
  mushrooms: { display: "Mushrooms", roles: ["veg"], notes: ["umami", "earthy", "meaty"],
    cuisines: ["Italian", "French", "Chinese"], aliases: ["mushroom"] },
  courgette: { display: "Courgette", roles: ["veg"], notes: ["mild", "fresh"], cuisines: ["Italian", "Mediterranean"], aliases: ["zucchini"] },
  carrots: { display: "Carrots", roles: ["veg", "sweet", "crunch"], notes: ["sweet", "earthy"],
    cuisines: ["French", "Chinese", "Indian"], aliases: ["carrot"] },
  "sweet potato": { display: "Sweet potato", roles: ["base", "veg", "sweet"], notes: ["sweet", "starchy"], cuisines: ["American", "Indian", "Thai"] },
  corn: { display: "Corn", roles: ["veg", "sweet"], notes: ["sweet", "juicy"], cuisines: ["Mexican", "American"], aliases: ["sweetcorn"] },
  peas: { display: "Peas", roles: ["veg", "sweet", "garnish"], notes: ["sweet", "fresh"], cuisines: ["Indian", "Italian", "British"], aliases: ["pea", "garden peas"] },

  // ── Aromatics ─────────────────────────────────────────────────────────
  garlic: { display: "Garlic", roles: ["aromatic"], notes: ["pungent", "savoury"],
    cuisines: ["Italian", "Chinese", "Indian", "Mediterranean", "Thai", "French", "Mexican"] },
  onion: { display: "Onion", roles: ["aromatic", "veg"], notes: ["sweet when cooked", "savoury"],
    cuisines: ["Italian", "Indian", "Mexican", "French", "Mediterranean", "American"], aliases: ["onions", "red onion", "white onion"] },
  ginger: { display: "Ginger", roles: ["aromatic", "heat"], notes: ["warm", "zingy"], cuisines: ["Chinese", "Indian", "Thai", "Japanese"] },
  "spring onion": { display: "Spring onion", roles: ["aromatic", "garnish"], notes: ["fresh", "mild"], cuisines: ["Chinese", "Thai"], aliases: ["scallion", "scallions", "green onion"] },

  // ── Acids ─────────────────────────────────────────────────────────────
  lemon: { display: "Lemon", roles: ["acid", "garnish"], notes: ["bright", "citrus"],
    cuisines: ["Mediterranean", "Italian", "Middle Eastern", "French"], aliases: ["lemons", "lemon juice"] },
  lime: { display: "Lime", roles: ["acid", "garnish"], notes: ["bright", "citrus", "tangy"],
    cuisines: ["Thai", "Mexican", "Indian"], aliases: ["limes", "lime juice"] },
  vinegar: { display: "Vinegar", roles: ["acid"], notes: ["sharp", "tangy"], cuisines: ["Chinese", "Mediterranean", "American"], aliases: ["balsamic", "rice vinegar"] },

  // ── Fats / dairy ──────────────────────────────────────────────────────
  cream: { display: "Cream", roles: ["fat"], notes: ["dairy", "rich", "smooth"], cuisines: ["Italian", "French", "Indian"], aliases: ["double cream", "heavy cream"] },
  milk: { display: "Milk", roles: ["fat"], notes: ["dairy", "mild"], cuisines: ["French", "British", "American"] },
  cheddar: { display: "Cheddar", roles: ["fat", "garnish"], notes: ["dairy", "umami", "salty"], cuisines: ["American", "British"], aliases: ["cheese", "grated cheese"] },
  parmesan: { display: "Parmesan", roles: ["garnish", "fat"], notes: ["dairy", "umami", "salty", "nutty"], cuisines: ["Italian"], aliases: ["parmigiano", "pecorino"] },
  yoghurt: { display: "Yoghurt", roles: ["acid", "fat"], notes: ["dairy", "tangy", "cooling"], cuisines: ["Indian", "Middle Eastern", "Mediterranean"], aliases: ["yogurt", "greek yoghurt"] },
  "coconut milk": { display: "Coconut milk", roles: ["fat", "base"], notes: ["rich", "sweet", "creamy"], cuisines: ["Thai", "Indian"] },
  tahini: { display: "Tahini", roles: ["fat"], notes: ["nutty", "earthy"], cuisines: ["Middle Eastern"] },
  "sesame oil": { display: "Sesame oil", roles: ["fat", "garnish"], notes: ["nutty", "aromatic", "toasty"], cuisines: ["Chinese", "Japanese", "Thai"] },

  // ── Heat ──────────────────────────────────────────────────────────────
  "chilli flakes": { display: "Chilli flakes", roles: ["heat"], notes: ["spicy"], cuisines: ["Italian", "Chinese", "Mexican"], aliases: ["chili flakes", "red pepper flakes"] },
  cayenne: { display: "Cayenne", roles: ["heat", "spice"], notes: ["spicy"], cuisines: ["Indian", "Mexican", "American"] },
  "chilli powder": { display: "Chilli powder", roles: ["heat", "spice"], notes: ["spicy"], cuisines: ["Mexican", "Indian"], aliases: ["chili powder"] },
  "fresh chilli": { display: "Fresh chilli", roles: ["heat", "aromatic"], notes: ["spicy", "fresh"], cuisines: ["Thai", "Mexican", "Indian"], aliases: ["chilli", "chili", "chillies"] },

  // ── Spices ────────────────────────────────────────────────────────────
  cumin: { display: "Cumin", roles: ["spice"], notes: ["warm", "earthy"], cuisines: ["Indian", "Mexican", "Middle Eastern"] },
  coriander: { display: "Coriander", roles: ["spice"], notes: ["warm", "citrusy"], cuisines: ["Indian", "Thai", "Middle Eastern"] },
  turmeric: { display: "Turmeric", roles: ["spice"], notes: ["earthy", "warm"], cuisines: ["Indian"] },
  "garam masala": { display: "Garam masala", roles: ["spice"], notes: ["warm", "complex"], cuisines: ["Indian"] },
  paprika: { display: "Paprika", roles: ["spice"], notes: ["sweet", "mild"], cuisines: ["Spanish", "Mediterranean", "American"] },
  "smoked paprika": { display: "Smoked paprika", roles: ["spice"], notes: ["smoky", "sweet"], cuisines: ["Spanish", "Mediterranean"] },
  "curry powder": { display: "Curry powder", roles: ["spice"], notes: ["warm", "complex"], cuisines: ["Indian"] },

  // ── Herbs ─────────────────────────────────────────────────────────────
  oregano: { display: "Oregano", roles: ["herb"], notes: ["earthy", "aromatic"], cuisines: ["Italian", "Mediterranean", "Mexican"] },
  thyme: { display: "Thyme", roles: ["herb"], notes: ["earthy", "woody"], cuisines: ["French", "Mediterranean"] },
  parsley: { display: "Parsley", roles: ["herb", "garnish"], notes: ["fresh", "green"], cuisines: ["Mediterranean", "Italian", "Middle Eastern"] },
  rosemary: { display: "Rosemary", roles: ["herb"], notes: ["woody", "piney"], cuisines: ["Italian", "Mediterranean", "French"] },
  basil: { display: "Basil", roles: ["herb", "garnish"], notes: ["fresh", "sweet", "aromatic"], cuisines: ["Italian", "Thai"] },
  "bay leaves": { display: "Bay leaves", roles: ["herb"], notes: ["aromatic"], cuisines: ["French", "Mediterranean", "Indian"], aliases: ["bay leaf"] },
  "mixed herbs": { display: "Mixed herbs", roles: ["herb"], notes: ["aromatic"], cuisines: ["Mediterranean", "Italian"], aliases: ["italian herbs", "herbs de provence"] },
  "fresh herbs": { display: "Fresh herbs", roles: ["herb", "garnish"], notes: ["fresh", "green"], cuisines: ["Mediterranean"], aliases: ["coriander leaf", "cilantro"] },

  // ── Umami seasonings / sauces ─────────────────────────────────────────
  "soy sauce": { display: "Soy sauce", roles: ["spice", "acid"], notes: ["umami", "salty"], cuisines: ["Chinese", "Japanese", "Thai"] },
  "fish sauce": { display: "Fish sauce", roles: ["spice"], notes: ["umami", "salty", "funky"], cuisines: ["Thai", "Chinese"] },
  "oyster sauce": { display: "Oyster sauce", roles: ["spice"], notes: ["umami", "sweet-salty"], cuisines: ["Chinese"] },
  "miso paste": { display: "Miso paste", roles: ["spice"], notes: ["umami", "salty"], cuisines: ["Japanese"], aliases: ["miso"] },
  "tomato paste": { display: "Tomato paste", roles: ["veg", "spice"], notes: ["umami", "concentrated", "sweet-acidic"], cuisines: ["Italian", "Mediterranean"], aliases: ["tomato puree"] },
  "stock cubes": { display: "Stock cubes", roles: ["spice"], notes: ["umami", "savoury"], cuisines: ["French", "British"], aliases: ["stock cube", "stock", "bouillon"] },
  "worcestershire sauce": { display: "Worcestershire sauce", roles: ["spice", "acid"], notes: ["umami", "tangy"], cuisines: ["British", "American"] },
  mustard: { display: "Mustard", roles: ["acid", "heat"], notes: ["tangy", "sharp"], cuisines: ["French", "American"], aliases: ["dijon", "dijon mustard"] },

  // ── Sweet ─────────────────────────────────────────────────────────────
  honey: { display: "Honey", roles: ["sweet"], notes: ["sweet", "floral"], cuisines: ["Mediterranean", "Middle Eastern", "Chinese"] },
  sugar: { display: "Sugar", roles: ["sweet"], notes: ["sweet"], cuisines: ["Chinese", "Thai", "American"] },
};
