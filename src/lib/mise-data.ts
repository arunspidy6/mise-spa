// ── Inventory data ─────────────────────────────────────────────────────────

export const STAPLES_DEFAULTS = [
  "Olive oil", "Salt", "Pepper", "Garlic", "Onion",
  "Eggs", "Butter", "Flour", "Sugar", "Soy sauce",
  "Stock cubes", "Vinegar", "Tomato paste", "Chilli flakes", "Cumin",
];

// Categorised sections for inventory UI
export const STAPLE_SECTIONS = [
  { label: "Oils & fats",    items: ["Olive oil", "Butter"] },
  { label: "Seasonings",     items: ["Salt", "Pepper", "Chilli flakes", "Cumin"] },
  { label: "Aromatics",      items: ["Garlic", "Onion"] },
  { label: "Spices",         items: ["Paprika", "Turmeric", "Garam masala", "Oregano", "Coriander", "Cayenne"] },
  { label: "Eggs & baking",  items: ["Eggs", "Flour", "Sugar"] },
  { label: "Sauces & stock", items: ["Soy sauce", "Tomato paste", "Stock cubes", "Vinegar"] },
];

export const PROTEIN_SECTIONS = [
  { label: "Poultry",        items: ["Chicken thighs", "Chicken breast"] },
  { label: "Meat",           items: ["Beef mince", "Steak", "Pork chops", "Lamb", "Bacon"] },
  { label: "Fish & seafood", items: ["Salmon", "White fish", "Prawns", "Canned tuna"] },
  { label: "Plant-based",    items: ["Eggs", "Tofu", "Chickpeas", "Lentils"] },
];

export const CARB_SECTIONS = [
  { label: "Grains & pasta", items: ["Pasta", "Rice", "Noodles", "Couscous"] },
  { label: "Other carbs",    items: ["Potatoes", "Bread", "Tortillas"] },
];

export const VEG_SECTIONS = [
  { label: "Fresh veg",    items: ["Tomatoes", "Peppers", "Spinach", "Broccoli", "Mushrooms", "Courgette", "Carrots"] },
  { label: "Root & other", items: ["Sweet potato", "Corn", "Peas"] },
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
