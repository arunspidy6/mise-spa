import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { ArrowLeft, ArrowRight, Plus, X, Check, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MobileFrame } from "@/components/mise/MobileFrame";
import { KeyboardAwareFooter } from "@/components/mise/KeyboardAwareFooter";
import { useScrollIntoViewOnFocus } from "@/hooks/use-scroll-into-view-on-focus";
import { useSwipeBack } from "@/hooks/use-swipe-back";
import { hapticWarn, hapticLight } from "@/lib/haptics";
import { EmberButton } from "@/components/mise/EmberButton";
import { useMise } from "@/store/mise";
import type { Inventory } from "@/store/mise";
import { API_BASE } from "@/lib/generate-recipe";
import { appHeaders } from "@/lib/appguard";
import { getDeviceId } from "@/lib/device";
import {
  STAPLE_SECTIONS, PROTEIN_SECTIONS, CARB_SECTIONS,
  VEG_SECTIONS, FRIDGE_SECTIONS, APPLIANCE_SECTIONS,
} from "@/lib/mise-data";

function sanitiseIngredient(raw: string): string | null {
  if (!raw) return null;
  let clean = raw.replace(/[\u{1F000}-\u{1FFFF}]/gu, "");
  clean = clean.replace(/[^a-zA-Z\s\-']/g, "");
  clean = clean.replace(/\s+/g, " ").trim();
  if (clean.length < 2) return null;
  if (!/[a-zA-Z]/.test(clean)) return null;
  if (clean.length > 40) return null;
  return clean.replace(/\b\w/g, c => c.toUpperCase());
}

// Instant ingredient lookup — key is lowercase display name.
// category: where to route it in inventory. satToken: which SAT key to use for recipe matching.
export const MASTER_INGREDIENTS: Record<string, { category: string; satToken: string }> = {
  // ── Chicken ─────────────────────────────────────────────────────────────────
  "chicken thighs":     { category: "proteins", satToken: "chicken thighs" },
  "chicken breast":     { category: "proteins", satToken: "chicken breast" },
  "chicken wings":      { category: "proteins", satToken: "chicken thighs" },
  "chicken drumsticks": { category: "proteins", satToken: "chicken thighs" },
  "chicken legs":       { category: "proteins", satToken: "chicken thighs" },
  "chicken mince":      { category: "proteins", satToken: "chicken thighs" },
  "chicken pieces":     { category: "proteins", satToken: "chicken thighs" },
  "chicken strips":     { category: "proteins", satToken: "chicken breast" },
  "chicken goujons":    { category: "proteins", satToken: "chicken breast" },
  // ── Beef ────────────────────────────────────────────────────────────────────
  "beef mince":         { category: "proteins", satToken: "beef mince" },
  "mince":              { category: "proteins", satToken: "beef mince" },
  "ground beef":        { category: "proteins", satToken: "beef mince" },
  "steak":              { category: "proteins", satToken: "steak" },
  "beef diced":         { category: "proteins", satToken: "steak" },
  "diced beef":         { category: "proteins", satToken: "steak" },
  "sirloin":            { category: "proteins", satToken: "steak" },
  "ribeye":             { category: "proteins", satToken: "steak" },
  "rump steak":         { category: "proteins", satToken: "steak" },
  "fillet steak":       { category: "proteins", satToken: "steak" },
  "braising steak":     { category: "proteins", satToken: "steak" },
  // ── Pork ────────────────────────────────────────────────────────────────────
  "pork chops":         { category: "proteins", satToken: "pork chops" },
  "pork mince":         { category: "proteins", satToken: "pork chops" },
  "pork diced":         { category: "proteins", satToken: "pork chops" },
  "pork belly":         { category: "proteins", satToken: "pork belly" },
  "sausages":           { category: "proteins", satToken: "sausages" },
  "chipolatas":         { category: "proteins", satToken: "sausages" },
  "chorizo":            { category: "proteins", satToken: "sausages" },
  "bacon":              { category: "proteins", satToken: "bacon" },
  "streaky bacon":      { category: "proteins", satToken: "bacon" },
  "pancetta":           { category: "proteins", satToken: "bacon" },
  "lardons":            { category: "proteins", satToken: "bacon" },
  // ── Lamb ────────────────────────────────────────────────────────────────────
  "lamb":               { category: "proteins", satToken: "lamb" },
  "lamb mince":         { category: "proteins", satToken: "lamb" },
  "lamb chops":         { category: "proteins", satToken: "lamb" },
  "lamb diced":         { category: "proteins", satToken: "lamb" },
  "lamb shoulder":      { category: "proteins", satToken: "lamb" },
  "lamb leg":           { category: "proteins", satToken: "lamb" },
  // ── Other meat ──────────────────────────────────────────────────────────────
  "duck":               { category: "proteins", satToken: "chicken thighs" },
  "duck breast":        { category: "proteins", satToken: "chicken thighs" },
  "turkey":             { category: "proteins", satToken: "chicken breast" },
  "turkey mince":       { category: "proteins", satToken: "beef mince" },
  "venison":            { category: "proteins", satToken: "lamb" },
  "rabbit":             { category: "proteins", satToken: "chicken thighs" },
  // ── Fish ────────────────────────────────────────────────────────────────────
  "salmon":             { category: "proteins", satToken: "salmon" },
  "white fish":         { category: "proteins", satToken: "white fish" },
  "cod":                { category: "proteins", satToken: "white fish" },
  "haddock":            { category: "proteins", satToken: "white fish" },
  "sea bass":           { category: "proteins", satToken: "white fish" },
  "pollock":            { category: "proteins", satToken: "white fish" },
  "coley":              { category: "proteins", satToken: "white fish" },
  "tilapia":            { category: "proteins", satToken: "white fish" },
  "trout":              { category: "proteins", satToken: "salmon" },
  "oily fish":          { category: "proteins", satToken: "oily fish" },
  "mackerel":           { category: "proteins", satToken: "oily fish" },
  "sardines":           { category: "proteins", satToken: "oily fish" },
  "herring":            { category: "proteins", satToken: "oily fish" },
  "smoked salmon":      { category: "proteins", satToken: "smoked salmon" },
  // ── Seafood ─────────────────────────────────────────────────────────────────
  "prawns":             { category: "proteins", satToken: "prawns" },
  "shrimp":             { category: "proteins", satToken: "prawns" },
  "king prawns":        { category: "proteins", satToken: "prawns" },
  "tiger prawns":       { category: "proteins", satToken: "prawns" },
  "canned tuna":        { category: "proteins", satToken: "canned tuna" },
  "tinned tuna":        { category: "proteins", satToken: "canned tuna" },
  "squid":              { category: "proteins", satToken: "prawns" },
  "mussels":            { category: "proteins", satToken: "prawns" },
  "clams":              { category: "proteins", satToken: "prawns" },
  "crab":               { category: "proteins", satToken: "prawns" },
  "lobster":            { category: "proteins", satToken: "prawns" },
  "scallops":           { category: "proteins", satToken: "prawns" },
  // ── Plant-based proteins ────────────────────────────────────────────────────
  "eggs":               { category: "proteins", satToken: "eggs" },
  "tofu":               { category: "proteins", satToken: "tofu" },
  "firm tofu":          { category: "proteins", satToken: "tofu" },
  "silken tofu":        { category: "proteins", satToken: "tofu" },
  "tempeh":             { category: "proteins", satToken: "tofu" },
  "seitan":             { category: "proteins", satToken: "tofu" },
  "quorn":              { category: "proteins", satToken: "tofu" },
  "quorn mince":        { category: "proteins", satToken: "beef mince" },
  "chickpeas":          { category: "proteins", satToken: "chickpeas" },
  "lentils":            { category: "proteins", satToken: "lentils" },
  "red lentils":        { category: "proteins", satToken: "lentils" },
  "green lentils":      { category: "proteins", satToken: "lentils" },
  "puy lentils":        { category: "proteins", satToken: "lentils" },
  "kidney beans":       { category: "proteins", satToken: "chickpeas" },
  "black beans":        { category: "proteins", satToken: "chickpeas" },
  "cannellini beans":   { category: "proteins", satToken: "chickpeas" },
  "butter beans":       { category: "proteins", satToken: "chickpeas" },
  "borlotti beans":     { category: "proteins", satToken: "chickpeas" },
  "edamame":            { category: "proteins", satToken: "chickpeas" },
  "split peas":         { category: "proteins", satToken: "lentils" },
  // ── Carbs ───────────────────────────────────────────────────────────────────
  "pasta":              { category: "carbs", satToken: "pasta" },
  "spaghetti":          { category: "carbs", satToken: "pasta" },
  "penne":              { category: "carbs", satToken: "pasta" },
  "fusilli":            { category: "carbs", satToken: "pasta" },
  "tagliatelle":        { category: "carbs", satToken: "pasta" },
  "rigatoni":           { category: "carbs", satToken: "pasta" },
  "linguine":           { category: "carbs", satToken: "pasta" },
  "orzo":               { category: "carbs", satToken: "pasta" },
  "rice":               { category: "carbs", satToken: "rice" },
  "basmati rice":       { category: "carbs", satToken: "rice" },
  "jasmine rice":       { category: "carbs", satToken: "rice" },
  "brown rice":         { category: "carbs", satToken: "rice" },
  "arborio rice":       { category: "carbs", satToken: "rice" },
  "noodles":            { category: "carbs", satToken: "noodles" },
  "egg noodles":        { category: "carbs", satToken: "noodles" },
  "rice noodles":       { category: "carbs", satToken: "noodles" },
  "udon":               { category: "carbs", satToken: "noodles" },
  "soba":               { category: "carbs", satToken: "noodles" },
  "couscous":           { category: "carbs", satToken: "pasta" },
  "quinoa":             { category: "carbs", satToken: "rice" },
  "bulgur wheat":       { category: "carbs", satToken: "couscous" },
  "polenta":            { category: "carbs", satToken: "rice" },
  "potatoes":           { category: "carbs", satToken: "potatoes" },
  "sweet potato":       { category: "carbs", satToken: "potatoes" },
  "bread":              { category: "carbs", satToken: "bread" },
  "sourdough":          { category: "carbs", satToken: "bread" },
  "baguette":           { category: "carbs", satToken: "bread" },
  "pitta":              { category: "carbs", satToken: "bread" },
  "naan":               { category: "carbs", satToken: "bread" },
  "tortillas":          { category: "carbs", satToken: "tortillas" },
  "wraps":              { category: "carbs", satToken: "tortillas" },
  "oats":               { category: "carbs", satToken: "rice" },
  // ── Vegetables ──────────────────────────────────────────────────────────────
  "tomatoes":           { category: "vegetables", satToken: "tomatoes" },
  "cherry tomatoes":    { category: "vegetables", satToken: "tomatoes" },
  "vine tomatoes":      { category: "vegetables", satToken: "tomatoes" },
  "sun-dried tomatoes": { category: "vegetables", satToken: "tomatoes" },
  "peppers":            { category: "vegetables", satToken: "peppers" },
  "red pepper":         { category: "vegetables", satToken: "peppers" },
  "green pepper":       { category: "vegetables", satToken: "peppers" },
  "yellow pepper":      { category: "vegetables", satToken: "peppers" },
  "capsicum":           { category: "vegetables", satToken: "peppers" },
  "jalapeño":           { category: "vegetables", satToken: "peppers" },
  "jalapeno":           { category: "vegetables", satToken: "peppers" },
  "chilli pepper":      { category: "vegetables", satToken: "peppers" },
  "spinach":            { category: "vegetables", satToken: "spinach" },
  "baby spinach":       { category: "vegetables", satToken: "spinach" },
  "kale":               { category: "vegetables", satToken: "spinach" },
  "rocket":             { category: "vegetables", satToken: "spinach" },
  "arugula":            { category: "vegetables", satToken: "spinach" },
  "watercress":         { category: "vegetables", satToken: "spinach" },
  "chard":              { category: "vegetables", satToken: "spinach" },
  "cavolo nero":        { category: "vegetables", satToken: "spinach" },
  "broccoli":           { category: "vegetables", satToken: "broccoli" },
  "tenderstem broccoli":{ category: "vegetables", satToken: "broccoli" },
  "cauliflower":        { category: "vegetables", satToken: "broccoli" },
  "cabbage":            { category: "vegetables", satToken: "spinach" },
  "red cabbage":        { category: "vegetables", satToken: "spinach" },
  "savoy cabbage":      { category: "vegetables", satToken: "spinach" },
  "brussels sprouts":   { category: "vegetables", satToken: "broccoli" },
  "pak choi":           { category: "vegetables", satToken: "spinach" },
  "bok choy":           { category: "vegetables", satToken: "spinach" },
  "mushrooms":          { category: "vegetables", satToken: "mushrooms" },
  "portobello":         { category: "vegetables", satToken: "mushrooms" },
  "shiitake":           { category: "vegetables", satToken: "mushrooms" },
  "courgette":          { category: "vegetables", satToken: "courgette" },
  "zucchini":           { category: "vegetables", satToken: "courgette" },
  "aubergine":          { category: "vegetables", satToken: "courgette" },
  "eggplant":           { category: "vegetables", satToken: "courgette" },
  "butternut squash":   { category: "vegetables", satToken: "carrots" },
  "squash":             { category: "vegetables", satToken: "carrots" },
  "pumpkin":            { category: "vegetables", satToken: "carrots" },
  "carrots":            { category: "vegetables", satToken: "carrots" },
  "parsnip":            { category: "vegetables", satToken: "carrots" },
  "turnip":             { category: "vegetables", satToken: "carrots" },
  "swede":              { category: "vegetables", satToken: "carrots" },
  "beetroot":           { category: "vegetables", satToken: "carrots" },
  "radish":             { category: "vegetables", satToken: "carrots" },
  "celeriac":           { category: "vegetables", satToken: "carrots" },
  "peas":               { category: "vegetables", satToken: "spinach" },
  "sugar snap peas":    { category: "vegetables", satToken: "spinach" },
  "mangetout":          { category: "vegetables", satToken: "spinach" },
  "green beans":        { category: "vegetables", satToken: "broccoli" },
  "french beans":       { category: "vegetables", satToken: "broccoli" },
  "asparagus":          { category: "vegetables", satToken: "broccoli" },
  "leeks":              { category: "vegetables", satToken: "onion" },
  "spring onions":      { category: "vegetables", satToken: "onion" },
  "red onion":          { category: "vegetables", satToken: "onion" },
  "shallots":           { category: "vegetables", satToken: "onion" },
  "fennel":             { category: "vegetables", satToken: "onion" },
  "celery":             { category: "vegetables", satToken: "onion" },
  "sweetcorn":          { category: "vegetables", satToken: "tomatoes" },
  "corn":               { category: "vegetables", satToken: "tomatoes" },
  "cucumber":           { category: "vegetables", satToken: "tomatoes" },
  "avocado":            { category: "vegetables", satToken: "tomatoes" },
  "artichoke":          { category: "vegetables", satToken: "broccoli" },
  "okra":               { category: "vegetables", satToken: "courgette" },
  // ── Fridge & fresh ──────────────────────────────────────────────────────────
  "milk":               { category: "fridge", satToken: "milk" },
  "oat milk":           { category: "fridge", satToken: "milk" },
  "almond milk":        { category: "fridge", satToken: "milk" },
  "cream":              { category: "fridge", satToken: "cream" },
  "double cream":       { category: "fridge", satToken: "cream" },
  "single cream":       { category: "fridge", satToken: "cream" },
  "cheddar":            { category: "fridge", satToken: "cheddar" },
  "parmesan":           { category: "fridge", satToken: "parmesan" },
  "mozzarella":         { category: "fridge", satToken: "cheddar" },
  "feta":               { category: "fridge", satToken: "cheddar" },
  "halloumi":           { category: "fridge", satToken: "cheddar" },
  "brie":               { category: "fridge", satToken: "cheddar" },
  "ricotta":            { category: "fridge", satToken: "cream" },
  "cream cheese":       { category: "fridge", satToken: "cream" },
  "yoghurt":            { category: "fridge", satToken: "yoghurt" },
  "yogurt":             { category: "fridge", satToken: "yoghurt" },
  "greek yoghurt":      { category: "fridge", satToken: "yoghurt" },
  "sour cream":         { category: "fridge", satToken: "cream" },
  "crème fraîche":      { category: "fridge", satToken: "cream" },
  "creme fraiche":      { category: "fridge", satToken: "cream" },
  "butter":             { category: "fridge", satToken: "butter" },
  "lemon":              { category: "fridge", satToken: "lemons" },
  "lemons":             { category: "fridge", satToken: "lemons" },
  "lime":               { category: "fridge", satToken: "lemons" },
  "limes":              { category: "fridge", satToken: "lemons" },
  "ginger":             { category: "fridge", satToken: "ginger" },
  "fresh ginger":       { category: "fridge", satToken: "ginger" },
  "chilli":             { category: "fridge", satToken: "chilli flakes" },
  "fresh chilli":       { category: "fridge", satToken: "chilli flakes" },
  "coconut milk":       { category: "fridge", satToken: "coconut milk" },
  "sesame oil":         { category: "fridge", satToken: "olive oil" },
  "honey":              { category: "fridge", satToken: "honey" },
  "fish sauce":         { category: "fridge", satToken: "fish sauce" },
  "oyster sauce":       { category: "fridge", satToken: "soy sauce" },
  "tahini":             { category: "fridge", satToken: "olive oil" },
  "mustard":            { category: "fridge", satToken: "vinegar" },
  "dijon mustard":      { category: "fridge", satToken: "vinegar" },
  "miso":               { category: "fridge", satToken: "miso paste" },
  "miso paste":         { category: "fridge", satToken: "miso paste" },
  "lemongrass":         { category: "fridge", satToken: "ginger" },
  // ── Staples — oils & fats ───────────────────────────────────────────────────
  "olive oil":          { category: "staples", satToken: "olive oil" },
  "vegetable oil":      { category: "staples", satToken: "olive oil" },
  "sunflower oil":      { category: "staples", satToken: "olive oil" },
  "rapeseed oil":       { category: "staples", satToken: "olive oil" },
  "coconut oil":        { category: "staples", satToken: "olive oil" },
  // ── Staples — sauces & pantry ───────────────────────────────────────────────
  "soy sauce":          { category: "staples", satToken: "soy sauce" },
  "tamari":             { category: "staples", satToken: "soy sauce" },
  "tomato paste":       { category: "staples", satToken: "tomato paste" },
  "tomato puree":       { category: "staples", satToken: "tomato paste" },
  "passata":            { category: "staples", satToken: "tomato paste" },
  "stock cubes":        { category: "staples", satToken: "stock cubes" },
  "vinegar":            { category: "staples", satToken: "vinegar" },
  "balsamic vinegar":   { category: "staples", satToken: "vinegar" },
  "red wine vinegar":   { category: "staples", satToken: "vinegar" },
  "flour":              { category: "staples", satToken: "flour" },
  "plain flour":        { category: "staples", satToken: "flour" },
  "sugar":              { category: "staples", satToken: "sugar" },
  "caster sugar":       { category: "staples", satToken: "sugar" },
  "worcestershire":     { category: "staples", satToken: "worcestershire" },
  "worcestershire sauce":{ category: "staples", satToken: "worcestershire" },
  "msg":                { category: "staples", satToken: "salt" },
  // ── Staples — spices & herbs (persist between sessions) ────────────────────
  "salt":               { category: "staples", satToken: "salt" },
  "pepper":             { category: "staples", satToken: "pepper" },
  "black pepper":       { category: "staples", satToken: "pepper" },
  "white pepper":       { category: "staples", satToken: "pepper" },
  "chilli flakes":      { category: "staples", satToken: "chilli flakes" },
  "red pepper flakes":  { category: "staples", satToken: "chilli flakes" },
  "cumin":              { category: "staples", satToken: "cumin" },
  "ground cumin":       { category: "staples", satToken: "cumin" },
  "cumin seeds":        { category: "staples", satToken: "cumin" },
  "paprika":            { category: "staples", satToken: "paprika" },
  "smoked paprika":     { category: "staples", satToken: "paprika" },
  "sweet paprika":      { category: "staples", satToken: "paprika" },
  "turmeric":           { category: "staples", satToken: "turmeric" },
  "ground turmeric":    { category: "staples", satToken: "turmeric" },
  "coriander":          { category: "staples", satToken: "coriander" },
  "ground coriander":   { category: "staples", satToken: "coriander" },
  "coriander seeds":    { category: "staples", satToken: "coriander" },
  "garam masala":       { category: "staples", satToken: "garam masala" },
  "curry powder":       { category: "staples", satToken: "curry powder" },
  "chilli powder":      { category: "staples", satToken: "chilli powder" },
  "cayenne":            { category: "staples", satToken: "cayenne" },
  "cayenne pepper":     { category: "staples", satToken: "cayenne" },
  "oregano":            { category: "staples", satToken: "oregano" },
  "dried oregano":      { category: "staples", satToken: "oregano" },
  "thyme":              { category: "staples", satToken: "thyme" },
  "dried thyme":        { category: "staples", satToken: "thyme" },
  "rosemary":           { category: "staples", satToken: "rosemary" },
  "dried rosemary":     { category: "staples", satToken: "rosemary" },
  "basil":              { category: "staples", satToken: "oregano" },
  "dried basil":        { category: "staples", satToken: "oregano" },
  "bay leaves":         { category: "staples", satToken: "thyme" },
  "mixed herbs":        { category: "staples", satToken: "oregano" },
  "herbs de provence":  { category: "staples", satToken: "oregano" },
  "italian seasoning":  { category: "staples", satToken: "oregano" },
  "cinnamon":           { category: "staples", satToken: "garam masala" },
  "ground cinnamon":    { category: "staples", satToken: "garam masala" },
  "cinnamon sticks":    { category: "staples", satToken: "garam masala" },
  "cardamom":           { category: "staples", satToken: "garam masala" },
  "ground cardamom":    { category: "staples", satToken: "garam masala" },
  "cloves":             { category: "staples", satToken: "garam masala" },
  "ground cloves":      { category: "staples", satToken: "garam masala" },
  "nutmeg":             { category: "staples", satToken: "garam masala" },
  "ground nutmeg":      { category: "staples", satToken: "garam masala" },
  "allspice":           { category: "staples", satToken: "garam masala" },
  "star anise":         { category: "staples", satToken: "garam masala" },
  "five spice":         { category: "staples", satToken: "garam masala" },
  "chinese five spice": { category: "staples", satToken: "garam masala" },
  "fennel seeds":       { category: "staples", satToken: "cumin" },
  "mustard seeds":      { category: "staples", satToken: "cumin" },
  "fenugreek":          { category: "staples", satToken: "cumin" },
  "fenugreek seeds":    { category: "staples", satToken: "cumin" },
  "garlic powder":      { category: "staples", satToken: "garlic" },
  "onion powder":       { category: "staples", satToken: "onion" },
  "ras el hanout":      { category: "staples", satToken: "garam masala" },
  "za'atar":            { category: "staples", satToken: "oregano" },
  "sumac":              { category: "staples", satToken: "vinegar" },
  "harissa":            { category: "staples", satToken: "chilli powder" },
  "za atar":            { category: "staples", satToken: "oregano" },
  "baharat":            { category: "staples", satToken: "garam masala" },
  "berbere":            { category: "staples", satToken: "garam masala" },
  "saffron":            { category: "staples", satToken: "turmeric" },
  "vanilla":            { category: "staples", satToken: "sugar" },
  "vanilla extract":    { category: "staples", satToken: "sugar" },
  "nutritional yeast":  { category: "staples", satToken: "parmesan" },
  // ── Aromatics (can go in staples or fridge) ─────────────────────────────────
  "garlic":             { category: "staples", satToken: "garlic" },
  "onion":              { category: "staples", satToken: "onion" },
};

export const Route = createFileRoute("/inventory")({
  validateSearch: (s: Record<string, unknown>) => ({
    from: typeof s.from === "string" ? s.from : undefined,
    step: typeof s.step === "number"
      ? s.step
      : typeof s.step === "string"
        ? parseInt(s.step)
        : undefined,
  }),
  component: InventoryFlow,
});

// Direction-aware page-slide variants. `custom` is the nav direction: +1 forward
// (enter from right, exit left), -1 back (enter from left, exit right).
const STEP_SLIDE = {
  enter: (dir: number) => ({ x: dir >= 0 ? "100%" : "-100%" }),
  center: { x: 0 },
  exit: (dir: number) => ({ x: dir >= 0 ? "-100%" : "100%" }),
};

const STEPS = [
  // `cta` is the footer button label — it names the NEXT thing the user does,
  // so the flow reads staples → proteins → carbs → … → appliances → recipes.
  { key: "staples" as const,    label: "Pantry staples",  title: "What's in your kitchen?",       intro: "Everything highlighted is in your kitchen. Tap to remove what you don't have.", mode: "remove" as const, cta: "Add proteins",       sections: STAPLE_SECTIONS },
  { key: "proteins" as const,   label: "Proteins",         title: "What proteins do you have?",    intro: "Select everything you have right now. This drives your recipes.",            mode: "add" as const,    cta: "Add carbs",          sections: PROTEIN_SECTIONS },
  { key: "carbs" as const,      label: "Carbs",            title: "Anything carby?",               intro: "Pick what you actually have.",                                              mode: "add" as const,    cta: "Add vegetables",     sections: CARB_SECTIONS },
  { key: "vegetables" as const, label: "Vegetables",       title: "Veg in the fridge or counter?", intro: "Even just a few opens up a lot of options.",                                mode: "add" as const,    cta: "Add extras",         sections: VEG_SECTIONS },
  { key: "fridge" as const,     label: "Fridge & extras",  title: "What else is in the fridge?",   intro: "Dairy, sauces, the in-between things.",                                     mode: "add" as const,    cta: "Select appliances",  sections: FRIDGE_SECTIONS },
  { key: "appliances" as const, label: "Appliances",       title: "What can you cook with?",       intro: "We only suggest recipes you can actually make.",                            mode: "add" as const,    cta: "Find recipes",       sections: APPLIANCE_SECTIONS },
];

function Chip({ label, active, mode, onClick }: {
  label: string; active: boolean; mode: "add" | "remove"; onClick: () => void;
}) {
  const removeMode = mode === "remove";
  const style: React.CSSProperties = active
    ? {
        background: "var(--ember-chip)",
        borderColor: "var(--ember-chip)",
        color: "oklch(0.965 0.018 72)",   /* cream — 5.2:1 on darker chip orange */
        fontWeight: 600,
        boxShadow: "0 2px 8px oklch(0 0 0 / 0.28)",
      }
    : removeMode
      ? {
          background: "var(--bg-surface)",
          borderColor: "var(--border-subtle)",
          color: "var(--text-tertiary)",
          textDecorationLine: "line-through",
          boxShadow: "var(--shadow-sm)",
        }
      : {
          background: "var(--bg-elevated)",
          borderColor: "var(--border-default)",
          color: "var(--text-secondary)",
          boxShadow: "var(--shadow-sm)",
        };
  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-[13px] font-medium border transition-all duration-150 active:scale-[0.94] hover:brightness-[1.06]"
    >
      {active && mode === "add" && <CheckCircle2 className="w-3.5 h-3.5" />}
      {label}
      {active && mode === "remove" && <X className="w-3.5 h-3.5 opacity-60" />}
    </button>
  );
}

// Items commonly typed into the wrong category — auto-redirect with a toast
const MISPLACED: Partial<Record<string, "proteins" | "carbs" | "vegetables" | "fridge">> = {
  // Vegetables entered as protein / other
  parsnip:"vegetables", carrot:"vegetables", broccoli:"vegetables",
  spinach:"vegetables", courgette:"vegetables", zucchini:"vegetables",
  aubergine:"vegetables", eggplant:"vegetables", cucumber:"vegetables",
  celery:"vegetables", leek:"vegetables", asparagus:"vegetables",
  kale:"vegetables", cabbage:"vegetables", cauliflower:"vegetables",
  squash:"vegetables", pumpkin:"vegetables", beetroot:"vegetables",
  radish:"vegetables", fennel:"vegetables", okra:"vegetables",
  "bok choy":"vegetables", "pak choi":"vegetables", turnip:"vegetables",
  swede:"vegetables", sweetcorn:"vegetables", artichoke:"vegetables",
  // Carbs entered as protein
  sourdough:"carbs", baguette:"carbs", oats:"carbs",
  quinoa:"carbs", barley:"carbs", polenta:"carbs", flatbread:"carbs",
  // Proteins entered as veg / other
  chicken:"proteins", beef:"proteins", pork:"proteins", lamb:"proteins",
  salmon:"proteins", tuna:"proteins", shrimp:"proteins", prawns:"proteins",
  bacon:"proteins", tofu:"proteins", tempeh:"proteins",
  // Dairy entered as protein
  milk:"fridge", cheese:"fridge", yogurt:"fridge", yoghurt:"fridge", cream:"fridge",
};

export const CATEGORY_LABEL: Record<string, string> = {
  proteins:"proteins", carbs:"carbs", vegetables:"vegetables",
  fridge:"fridge", staples:"pantry", appliances:"appliances",
};

const capLabel = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// What happened when a custom item was added — drives the inline confirmation.
export type AddResult = { kind: "added" | "moved" | "duplicate"; label: string };

// Fuzzy ingredient search — handles typos like "tumeric" → "turmeric",
// "chiken" → "chicken". Uses sequential character matching so partial
// out-of-order characters still score well.
function scoredMatches(query: string): { key: string; score: number }[] {
  const q = query.toLowerCase().trim();
  if (q.length < 2) return [];
  return Object.keys(MASTER_INGREDIENTS)
    .map(key => {
      const k = key.toLowerCase();
      // Exact substring → highest score
      if (k.includes(q)) return { key, score: 1 + (k.startsWith(q) ? 0.1 : 0) };
      // Sequential character matching for typo tolerance
      let qi = 0, matches = 0;
      for (let ki = 0; ki < k.length && qi < q.length; ki++) {
        if (k[ki] === q[qi]) { matches++; qi++; }
      }
      const seqScore = qi === q.length
        ? 0.8 + matches / (k.length + 1)   // all query chars found in order
        : (matches / Math.max(q.length, k.length)) * 0.75;
      return { key, score: seqScore };
    })
    .filter(({ score }) => score > 0.6)
    .sort((a, b) => b.score - a.score);
}

const titleCase = (k: string) => k.replace(/\b\w/g, c => c.toUpperCase());

function fuzzyMatchIngredients(query: string, limit = 6): string[] {
  return scoredMatches(query).slice(0, limit).map(({ key }) => titleCase(key));
}

export function CustomItemInput({
  onAdd,
  addMapping,
}: {
  onAdd: (item: string, category?: string) => AddResult;
  addMapping: (displayLabel: string, satToken: string) => void;
}) {
  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [msg, setMsg] = useState<{ text: string; type: "error" | "info" } | null>(null);
  const [status, setStatus] = useState<"idle" | "checking">("idle");
  // Inline confirmation shown under the search bar (replaces the old toast),
  // plus a brief tick on the add button once the add completes.
  const [confirm, setConfirm] = useState<{ text: string; ok: boolean } | null>(null);
  const [justAdded, setJustAdded] = useState(false);
  const msgTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confirmTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { ref: inputRef, onFocus: scrollInputIntoView } = useScrollIntoViewOnFocus<HTMLInputElement>();

  useEffect(() => {
    return () => {
      if (msgTimeout.current) clearTimeout(msgTimeout.current);
      if (confirmTimeout.current) clearTimeout(confirmTimeout.current);
      if (tickTimeout.current) clearTimeout(tickTimeout.current);
    };
  }, []);

  const showMsg = (text: string, type: "error" | "info" = "error", ms = 3000) => {
    setMsg({ text, type });
    if (msgTimeout.current) clearTimeout(msgTimeout.current);
    msgTimeout.current = setTimeout(() => setMsg(null), ms);
  };

  // Commit the add, show inline confirmation + button tick. `info` overrides the
  // default "added to X" line (e.g. when we have no recipes for the ingredient).
  const commitAdd = (clean: string, info?: string, category?: string) => {
    const res = onAdd(clean, category);
    setValue(""); setSuggestions([]); setMsg(null);
    const ok = res.kind !== "duplicate";
    if (ok) hapticLight(); else hapticWarn();
    setConfirm({
      text: info ?? (ok
        ? `“${clean}” added to ${capLabel(res.label)}`
        : `“${clean}” is already in your kitchen`),
      ok,
    });
    if (confirmTimeout.current) clearTimeout(confirmTimeout.current);
    confirmTimeout.current = setTimeout(() => setConfirm(null), 2600);
    if (ok) {
      setJustAdded(true);
      if (tickTimeout.current) clearTimeout(tickTimeout.current);
      tickTimeout.current = setTimeout(() => setJustAdded(false), 1400);
    }
  };

  const handleChange = (val: string) => {
    setValue(val);
    setSuggestions(fuzzyMatchIngredients(val));
  };

  const handleFocus = () => {
    requestAnimationFrame(() => {
      inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  const resolveAndAdd = async (raw: string) => {
    // Empty submit → nudge with a buzz so the tap doesn't feel ignored.
    if (!raw.trim()) {
      hapticWarn();
      showMsg("Type an ingredient first");
      return;
    }
    const clean = sanitiseIngredient(raw);
    if (!clean) { hapticWarn(); showMsg("Letters only — no numbers or symbols"); return; }
    const lower = clean.toLowerCase();

    // ① Instant lookup — MASTER_INGREDIENTS (no API call needed)
    const masterEntry = MASTER_INGREDIENTS[lower];
    if (masterEntry) {
      addMapping(lower, masterEntry.satToken);
      commitAdd(clean, undefined, masterEntry.category);
      return;
    }

    // Spelling guard: if the word isn't a known ingredient but very closely
    // matches one (a likely typo), offer "Did you mean?" corrections and a buzz
    // instead of silently adding a misspelling. Only intercepts strong matches,
    // so genuinely new ingredients still fall through to the classifier below.
    const top = scoredMatches(lower)[0];
    if (top && top.score >= 1) {
      const picks = fuzzyMatchIngredients(lower);
      if (picks.length && picks[0].toLowerCase() !== lower) {
        setSuggestions(picks);
        showMsg("Did you mean one of these?", "info");
        hapticWarn();
        return;
      }
    }

    // ② localStorage cache (API result from a previous visit)
    try {
      const cached = localStorage.getItem(`mise-cls-${lower}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.satToken) addMapping(lower, parsed.satToken);
        // Even if previously marked invalid, add now — user insists
        commitAdd(clean, parsed.isValid ? undefined : `Added “${clean}” — we don't have recipes for this yet`, parsed.category);
        return;
      }
    } catch { /* ignore */ }

    // ③ API classification (once per device, then cached)
    setStatus("checking");
    let info: string | undefined;
    let category: string | undefined;
    try {
      const res = await fetch(`${API_BASE}/api/classify-ingredient`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Device-ID": getDeviceId(), ...appHeaders() },
        body: JSON.stringify({ ingredient: lower }),
      });
      if (res.ok) {
        const result = await res.json();
        try { localStorage.setItem(`mise-cls-${lower}`, JSON.stringify(result)); } catch {}
        if (result.satToken) addMapping(lower, result.satToken);
        category = result.category;
        if (result.isValid === false) {
          // Don't block — add it and explain gracefully
          info = `Added “${clean}” — we don't have recipes for this ingredient yet`;
        }
      }
    } catch { /* API unavailable — add without mapping, no message */ }

    setStatus("idle");
    commitAdd(clean, info, category);
  };

  return (
    <div className="mb-4">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            value={value}
            onChange={e => handleChange(e.target.value)}
            onFocus={e => { scrollInputIntoView(); handleFocus(e); }}
            onKeyDown={e => e.key === "Enter" && !e.repeat && resolveAndAdd(value)}
            placeholder="Not listed? Type to search or add…"
            autoCorrect="on"
            autoCapitalize="words"
            maxLength={40}
            disabled={status === "checking"}
            className="w-full h-11 bg-bg-surface border border-border-subtle rounded-xl px-4 text-[14px] text-text-primary placeholder:text-text-tertiary focus:border-ember focus:outline-none disabled:opacity-60 transition-opacity"
          />
        </div>
        <button
          onClick={() => resolveAndAdd(value)}
          disabled={status === "checking"}
          aria-label="Add ingredient"
          className={`w-11 h-11 rounded-xl border flex items-center justify-center active:scale-95 disabled:opacity-60 transition-colors ${
            justAdded
              ? "bg-success/15 border-success text-success"
              : "bg-bg-raised border-border-default text-text-secondary"
          }`}
        >
          {status === "checking" ? (
            <div className="w-4 h-4 border-2 border-ember border-t-transparent rounded-full animate-spin" />
          ) : justAdded ? (
            <Check className="w-4 h-4" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Inline confirmation — replaces the toast: "<name> added to <Category>" */}
      {confirm && (
        <p className={`text-[12px] mt-1.5 px-1 flex items-center gap-1.5 ${confirm.ok ? "text-ember-text" : "text-text-secondary"}`}>
          {confirm.ok && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
          {confirm.text}
        </p>
      )}

      {msg && (
        <p className={`text-[12px] mt-1.5 px-1 ${msg.type === "error" ? "text-red-400" : "text-text-secondary"}`}>
          {msg.text}
        </p>
      )}

      {suggestions.length > 0 && status === "idle" && (
        <div className="mt-3">
          <p className="text-[11px] text-text-tertiary mb-2 px-1">Did you mean?</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map(s => (
              <button
                key={s}
                onMouseDown={e => { e.preventDefault(); resolveAndAdd(s); }}
                className="h-8 px-3 rounded-full bg-bg-raised border border-border-default text-[12px] text-text-secondary active:bg-ember active:text-bg-base active:border-ember transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InventoryFlow() {
  const navigate = useNavigate();
  const router = useRouter();
  const { from, step: initStep } = Route.useSearch();
  const inventory = useMise(s => s.inventory);
  const toggleItem = useMise(s => s.toggleItem);
  const finalize = useMise(s => s.finalizeInventory);
  const setInventory = useMise(s => s.setInventory);
  const addCustomItem = useMise(s => s.addCustomItem);
  const addCustomTokenMapping = useMise(s => s.addCustomTokenMapping);
  const [step, setStep] = useState(initStep ?? 0);
  // Track navigation direction so the page slide follows the gesture: +1 forward
  // (new enters from the right), -1 back (new enters from the left).
  const [dir, setDir] = useState(0);
  const goStep = (target: number, direction: number) => { setDir(direction); setStep(target); };
  const goPrev = () => (step === 0 ? goBack() : goStep(step - 1, -1));

  const cur = STEPS[step];
  const selected = (inventory[cur.key] as string[] | undefined) ?? [];
  const allItems = cur.sections.flatMap(s => s.items);
  const isLast = step === STEPS.length - 1;
  const selectedCount = selected.filter(i => allItems.includes(i)).length;

  const goBack = () => {
    if (from === "session") navigate({ to: "/session" });
    else if (from === "home") navigate({ to: "/" });
    else if (router.history.length > 1) router.history.back();
    else navigate({ to: "/" });
  };

  const next = () => {
    if (isLast) { finalize(); navigate({ to: "/session" }); }
    else goStep(step + 1, 1);
  };

  // Swipe from the left edge → previous step (or leave the flow on step 0),
  // mirroring the header back button.
  useSwipeBack(goPrev);

  return (
    <MobileFrame>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-5 pb-3">
          <button onClick={goPrev}
            className="w-11 h-11 -ml-2 flex items-center justify-center text-text-secondary active:scale-90">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col items-center leading-tight">
            <span className="text-[14px] font-semibold text-text-primary">{cur.label}</span>
            <span className="font-mono text-[10px] font-semibold text-ember-text uppercase tracking-widest mt-0.5">
              Step {step + 1} of {STEPS.length}
            </span>
          </div>
          {/* Returning users (kitchen set up before) get a direct "Find recipes"
              shortcut to Tonight's cook; first-timers still get a plain close. */}
          {inventory.lastUpdated != null ? (
            <button onClick={() => { finalize(); navigate({ to: "/session" }); }}
              className="h-11 -mr-2 pl-2 flex items-center gap-1 text-[13px] font-medium text-ember-text active:opacity-60 transition">
              Find recipes <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={() => { finalize(); goBack(); }}
              className="w-11 h-11 -mr-2 flex items-center justify-center text-text-tertiary active:scale-90">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Progress */}
        <div className="px-4 mb-4">
          <div className="h-[3px] bg-bg-overlay rounded-full flex gap-1 overflow-hidden">
            {STEPS.map((_, i) => (
              <div key={i} className={`flex-1 rounded-full transition-colors ${i <= step ? "bg-ember" : "bg-bg-overlay"}`} />
            ))}
          </div>
        </div>

        {/* Content — direction-aware page slide: both steps slide together so
            the screen moves in the direction of the swipe / navigation. */}
        <div className="relative flex-1 min-h-0 overflow-hidden">
        <AnimatePresence initial={false} custom={dir}>
          <motion.div key={step} custom={dir}
            variants={STEP_SLIDE}
            initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            className="absolute inset-0 overflow-y-auto overscroll-contain px-4 pb-4">

            <h1 className="font-display text-[28px] font-light text-text-primary leading-tight">{cur.title}</h1>

            {cur.mode === "remove" && (
              <div className="mt-4">
                <div className="rounded-xl border border-ember-dim px-4 py-3.5 flex gap-3 bg-ember-glow shadow-[0_2px_14px_rgba(0,0,0,0.28)]">
                  <motion.span
                    animate={{ y: [0, 5, 0] }}
                    transition={{ repeat: Infinity, duration: 1.3, ease: "easeInOut" }}
                    className="text-[22px] leading-none mt-0.5 flex-shrink-0"
                  >👇</motion.span>
                  <div>
                    <p className="text-[15px] font-semibold text-ember-text">Tap to remove what you don't have</p>
                    <p className="text-[12px] text-text-secondary mt-1 leading-relaxed">Everything below is assumed to be in your kitchen — tap anything you don't actually have.</p>
                  </div>
                </div>
              </div>
            )}

            {cur.mode === "add" && (
              <p className="text-[14px] text-text-secondary mt-2 leading-relaxed">{cur.intro}</p>
            )}

            {cur.key === "proteins" && (
              <div className="mt-3 rounded-lg border border-ember-dim px-4 py-3 bg-ember-glow">
                <p className="text-[13px] font-semibold text-ember-text">Most important step</p>
                <p className="text-[12px] text-text-secondary mt-0.5">Your protein drives which recipes we suggest.</p>
              </div>
            )}

            <p className="text-[11px] text-text-tertiary mt-4 mb-3">
              {cur.mode === "remove"
                ? `${selectedCount} of ${allItems.length} in your kitchen`
                : selectedCount > 0 ? `${selectedCount} selected` : "Tap to select"
              }
            </p>

            {cur.key !== "appliances" && (
              <CustomItemInput
                addMapping={addCustomTokenMapping}
                onAdd={(item, category): AddResult => {
                  const lower = item.toLowerCase();
                  // Route to the ingredient's TRUE category, not whichever screen
                  // it was typed on: classifier/master category first, then the
                  // misplaced-redirect map, else the current step.
                  const VALID_CATS = ["proteins", "carbs", "vegetables", "fridge", "staples"];
                  const resolved =
                    (category && VALID_CATS.includes(category) ? category : MASTER_INGREDIENTS[lower]?.category) as
                      | keyof Inventory
                      | undefined;
                  const targetCat = (resolved ?? MISPLACED[lower] ?? cur.key) as keyof Inventory;
                  if (targetCat !== cur.key) {
                    const targetList = (inventory[targetCat] as string[]) ?? [];
                    if (!targetList.map(s => s.toLowerCase()).includes(lower)) {
                      setInventory({ [targetCat]: [...targetList, item] } as never);
                      addCustomItem(item);
                    }
                    return { kind: "moved", label: CATEGORY_LABEL[targetCat] };
                  }
                  const list = (inventory[cur.key] as string[]) ?? [];
                  if (!list.map(s => s.toLowerCase()).includes(lower)) {
                    setInventory({ [cur.key]: [...list, item] } as never);
                    addCustomItem(item);
                    return { kind: "added", label: CATEGORY_LABEL[cur.key] };
                  }
                  return { kind: "duplicate", label: CATEGORY_LABEL[cur.key] };
                }}
              />
            )}

            {/* Added by you — shown directly below the input, above default chips */}
            {selected.filter(s => !allItems.includes(s)).length > 0 && (
              <div className="mb-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-tertiary mb-2">
                  Added by you
                </p>
                <div className="flex flex-wrap gap-2">
                  {selected.filter(s => !allItems.includes(s)).map(c => (
                    <Chip key={c} label={c} active mode={cur.mode} onClick={() => toggleItem(cur.key, c)} />
                  ))}
                </div>
              </div>
            )}

            {/* Default sections */}
            <div className="flex flex-col gap-5">
              {cur.sections.map(section => (
                <div key={section.label}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-tertiary mb-2">
                    {section.label}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {section.items.map(item => (
                      <Chip key={item} label={item}
                        active={selected.includes(item)}
                        mode={cur.mode}
                        onClick={() => toggleItem(cur.key, item)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {cur.key === "proteins" && selectedCount === 0 && (
              <div className="mt-4 rounded-lg bg-bg-surface border border-border-subtle px-4 py-3">
                <p className="text-[12px] text-text-secondary leading-relaxed">
                  <span className="text-text-primary font-medium">No protein?</span>{" "}
                  No protein? No problem. We have recipes for eggs, chickpeas and lentils.
                </p>
              </div>
            )}

            {cur.key === "staples" && (
              <p className="mt-5 text-[11px] text-text-tertiary italic">Your pantry selection is saved between sessions.</p>
            )}
          </motion.div>
        </AnimatePresence>
        </div>{/* end sliding content */}

        {/* Sticky CTA — hidden while keyboard is open so content fits the visible area */}
        <KeyboardAwareFooter>
          <EmberButton size="lg" className="w-full" onClick={next}>
            {cur.cta}
            <ArrowRight className="w-4 h-4" />
          </EmberButton>
        </KeyboardAwareFooter>
      </div>
    </MobileFrame>
  );
}
