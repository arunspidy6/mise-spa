// ── Inventory data ─────────────────────────────────────────────────────────

// Preselected staples — common in Irish households (shown already "in kitchen").
// Kept deliberately lean: just the everyday basics almost everyone has, so the
// assumed-pantry list stays honest and uncluttered. Herbs, stock and vinegar
// are no longer assumed by default — users add them if they have them.
export const STAPLES_DEFAULTS = [
  // Oils & fats
  "Olive oil", "Butter",
  // Core seasonings
  "Salt", "Black pepper", "Chilli flakes",
  // Aromatics
  "Garlic", "Onion",
  // Warm spices
  "Paprika",
  // Baking & dry goods
  "Flour", "Sugar",
  // Sauce
  "Tomato paste",
];

// Categorised sections for inventory UI
export const STAPLE_SECTIONS = [
  { label: "Oils & fats",       items: ["Olive oil", "Butter", "Vegetable oil", "Sesame oil"] },
  { label: "Core seasonings",   items: ["Salt", "Black pepper", "Chilli flakes"] },
  { label: "Aromatics",         items: ["Garlic", "Onion", "Ginger"] },
  { label: "Warm spices",       items: ["Cumin", "Coriander", "Turmeric", "Garam masala", "Paprika", "Smoked paprika"] },
  { label: "Herbs",             items: ["Oregano", "Thyme", "Parsley", "Rosemary", "Bay leaves", "Mixed herbs"] },
  { label: "Heat",              items: ["Cayenne", "Chilli powder", "Curry powder"] },
  { label: "Asian",             items: ["Soy sauce", "Fish sauce", "Oyster sauce", "Miso paste"] },
  { label: "Baking & dry goods",items: ["Flour", "Sugar", "Baking powder"] },
  { label: "Sauces & stock",    items: ["Tomato paste", "Stock cubes", "Vinegar", "Worcestershire sauce"] },
];

export const PROTEIN_SECTIONS = [
  {
    label: "Chicken",
    items: ["Chicken breast", "Chicken thighs", "Chicken legs", "Chicken wings", "Chicken mince"],
  },
  {
    label: "Beef",
    items: ["Beef mince", "Beef diced / steak"],
  },
  {
    label: "Pork",
    items: ["Pork mince", "Pork diced", "Pork chops", "Pork belly", "Sausages", "Bacon"],
  },
  {
    label: "Lamb",
    items: ["Lamb mince", "Lamb diced", "Lamb chops"],
  },
  {
    label: "Fish",
    items: ["Salmon", "White fish", "Oily fish", "Smoked salmon"],
  },
  {
    label: "Seafood",
    items: ["Prawns", "Canned tuna"],
  },
  {
    label: "Plant-based",
    items: ["Eggs", "Tofu", "Chickpeas", "Lentils"],
  },
];

export const CARB_SECTIONS = [
  { label: "Grains & pasta", items: ["Pasta", "Rice", "Noodles", "Couscous"] },
  { label: "Other carbs",    items: ["Bread", "Tortillas"] },
];

export const VEG_SECTIONS = [
  { label: "Fresh veg",    items: ["Tomatoes", "Peppers", "Spinach", "Broccoli", "Mushrooms", "Courgette", "Carrots"] },
  { label: "Root & other", items: ["Potatoes", "Sweet potato", "Corn", "Peas"] },
];

export const FRIDGE_SECTIONS = [
  { label: "Dairy",        items: ["Milk", "Cream", "Cheddar", "Parmesan", "Yoghurt"] },
  { label: "Fresh extras", items: ["Lemons", "Limes", "Fresh herbs"] },
  { label: "Sauces",       items: ["Coconut milk", "Sesame oil", "Honey", "Fish sauce", "Oyster sauce", "Tahini", "Mustard"] },
];

export const APPLIANCE_SECTIONS = [
  { label: "Cooking", items: ["Hob / Stove", "Oven", "Airfryer"] },
  { label: "Other",   items: ["Rice cooker", "Slow cooker", "Microwave", "Blender"] },
];

// Flat lists kept for backwards compat
export const PROTEINS = PROTEIN_SECTIONS.flatMap(s => s.items);
export const CARBS = CARB_SECTIONS.flatMap(s => s.items);
export const VEGETABLES = VEG_SECTIONS.flatMap(s => s.items);
export const FRIDGE = FRIDGE_SECTIONS.flatMap(s => s.items);
export const APPLIANCES = APPLIANCE_SECTIONS.flatMap(s => s.items);

export const TIME_OPTIONS = [
  { label: "30 min", value: 30, icon: "🕐" },
  { label: "45 min", value: 45, icon: "⏰" },
  { label: "1 hr",   value: 60, icon: "🌙" },
  { label: "1.5 hr+",value: 90, icon: "🌛" },
];

// Vibe / "what matters tonight" filter. Single-select on the session screen,
// stored as session.vibes ([] = no preference). The `value` is what the API
// prompt maps to guidance (see api/generate-recipe.ts), so keep them in sync.
export const VIBES = [
  { value: "use-up",    label: "Use up ingredients",     detail: "Cook down what's about to turn",  emoji: "🥬" },
  { value: "quick",     label: "Quick meal",             detail: "On the table fast, low fuss",     emoji: "⚡" },
  { value: "comfort",   label: "Comfort food",           detail: "Warm, hearty, satisfying",        emoji: "🍲" },
  { value: "healthy",   label: "Healthy",                detail: "Light and nourishing",            emoji: "🥗" },
  { value: "different", label: "Try something different", detail: "Break the weeknight routine",     emoji: "✨" },
] as const;

export type VibeValue = (typeof VIBES)[number]["value"];
