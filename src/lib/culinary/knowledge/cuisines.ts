// Cuisine templates — the "flavour direction" knowledge. Each template names
// the ingredient keys that define the cuisine so the scorer can measure how well
// a user's set fits it, and the blueprint builder knows which staples/aromatics
// to reach for. Keys must match knowledge/ingredients.ts (and staples.ts).

export type CuisineTemplate = {
  id: string;
  name: string;
  direction: string;        // the flavour story this cuisine tells
  bases: string[];          // bases that suit it (preference order)
  signatures: string[];     // ingredients that strongly indicate this cuisine
  aromatics: string[];
  fats: string[];
  acids: string[];
  heat: string[];
  finishers: string[];      // herbs/garnishes that complete it
};

export const CUISINES: CuisineTemplate[] = [
  {
    id: "italian", name: "Italian",
    direction: "garlic, tomato, and herbs with olive oil and cheese",
    bases: ["pasta", "rice", "bread"],
    signatures: ["pasta", "parmesan", "basil", "oregano", "tomatoes", "tomato paste", "mushrooms"],
    aromatics: ["garlic", "onion"], fats: ["olive oil", "butter", "cream", "parmesan"],
    acids: ["lemon", "tomatoes", "vinegar"], heat: ["chilli flakes"],
    finishers: ["basil", "parsley", "parmesan", "oregano"],
  },
  {
    id: "indian", name: "Indian",
    direction: "warm spices bloomed in fat with onion, garlic, and ginger",
    bases: ["rice", "lentils", "chickpeas", "potatoes"],
    signatures: ["cumin", "turmeric", "garam masala", "curry powder", "coriander", "ginger", "yoghurt", "lentils", "chickpeas"],
    aromatics: ["onion", "garlic", "ginger"], fats: ["butter", "yoghurt", "cream", "coconut milk", "vegetable oil"],
    acids: ["lemon", "lime", "yoghurt", "tomatoes"], heat: ["chilli powder", "cayenne", "fresh chilli"],
    finishers: ["fresh herbs", "coriander"],
  },
  {
    id: "mexican", name: "Mexican",
    direction: "cumin, chilli, and lime with tomato and corn",
    bases: ["tortillas", "rice"],
    signatures: ["cumin", "chilli powder", "lime", "corn", "tomatoes", "peppers", "tortillas"],
    aromatics: ["onion", "garlic"], fats: ["vegetable oil", "cheddar"],
    acids: ["lime", "tomatoes"], heat: ["chilli powder", "cayenne", "fresh chilli", "chilli flakes"],
    finishers: ["fresh herbs", "lime"],
  },
  {
    id: "chinese", name: "Chinese",
    direction: "soy, garlic, and ginger stir-fry with a sesame finish",
    bases: ["rice", "noodles"],
    signatures: ["soy sauce", "oyster sauce", "ginger", "sesame oil", "noodles", "spring onion", "tofu"],
    aromatics: ["garlic", "ginger", "spring onion", "onion"], fats: ["vegetable oil", "sesame oil"],
    acids: ["vinegar", "soy sauce"], heat: ["chilli flakes", "fresh chilli"],
    finishers: ["spring onion", "sesame oil"],
  },
  {
    id: "thai", name: "Thai",
    direction: "lime, fish sauce, chilli, and coconut — hot, sour, salty, sweet",
    bases: ["rice", "noodles"],
    signatures: ["fish sauce", "lime", "coconut milk", "ginger", "fresh chilli", "noodles", "prawns"],
    aromatics: ["garlic", "ginger", "spring onion"], fats: ["coconut milk", "vegetable oil"],
    acids: ["lime", "fish sauce"], heat: ["fresh chilli", "chilli flakes"],
    finishers: ["fresh herbs", "lime", "spring onion"],
  },
  {
    id: "mediterranean", name: "Mediterranean",
    direction: "olive oil, lemon, garlic, and herbs, fresh and bright",
    bases: ["couscous", "rice", "bread", "potatoes"],
    signatures: ["olive oil", "lemon", "tomatoes", "oregano", "parsley", "chickpeas", "couscous", "peppers"],
    aromatics: ["garlic", "onion"], fats: ["olive oil", "yoghurt", "tahini"],
    acids: ["lemon", "tomatoes", "vinegar"], heat: ["chilli flakes"],
    finishers: ["parsley", "lemon", "fresh herbs"],
  },
  {
    id: "french", name: "French",
    direction: "butter, herbs, and slow aromatics for a rich, savoury base",
    bases: ["potatoes", "bread", "rice"],
    signatures: ["butter", "cream", "thyme", "bay leaves", "mushrooms", "mustard"],
    aromatics: ["onion", "garlic"], fats: ["butter", "cream", "olive oil"],
    acids: ["lemon", "vinegar", "mustard"], heat: [],
    finishers: ["parsley", "thyme"],
  },
  {
    id: "american", name: "American",
    direction: "smoky, savoury comfort with cheese and a touch of sweet",
    bases: ["potatoes", "bread", "rice"],
    signatures: ["cheddar", "bacon", "smoked paprika", "corn", "honey", "mustard"],
    aromatics: ["onion", "garlic"], fats: ["butter", "cheddar", "vegetable oil"],
    acids: ["vinegar", "mustard"], heat: ["cayenne", "chilli flakes"],
    finishers: ["parsley", "spring onion"],
  },
  {
    id: "middle-eastern", name: "Middle Eastern",
    direction: "cumin, lemon, and tahini with chickpeas and herbs",
    bases: ["couscous", "rice", "bread", "chickpeas"],
    signatures: ["cumin", "tahini", "lemon", "chickpeas", "yoghurt", "parsley", "coriander"],
    aromatics: ["garlic", "onion"], fats: ["olive oil", "tahini", "yoghurt"],
    acids: ["lemon", "yoghurt"], heat: ["cayenne", "chilli flakes"],
    finishers: ["parsley", "fresh herbs", "lemon"],
  },
];

export function cuisineById(id: string): CuisineTemplate | undefined {
  return CUISINES.find(c => c.id === id);
}

export function cuisineByName(name: string): CuisineTemplate | undefined {
  const n = name.trim().toLowerCase();
  return CUISINES.find(c => c.name.toLowerCase() === n || c.id === n);
}
