import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

// Warm per-cuisine gradient sits UNDER every image — always visible while loading
const CUISINE_FALLBACK: Record<string, string> = {
  Italian:          "from-[#5a3a10] to-[#2a1a08]",
  Japanese:         "from-[#1d3a2a] to-[#0a1f14]",
  Mexican:          "from-[#5a2a10] to-[#2a1404]",
  Asian:            "from-[#3a1a08] to-[#1a0a04]",
  Chinese:          "from-[#4a1a10] to-[#1f0805]",
  Thai:             "from-[#1f4a2a] to-[#0a1f12]",
  Indian:           "from-[#5a3a08] to-[#2a1a04]",
  "Middle Eastern": "from-[#4a2a08] to-[#1f1004]",
  Mediterranean:    "from-[#1a3a4a] to-[#08191f]",
  American:         "from-[#4a1a1a] to-[#1f0808]",
};

// Known recipe names → the best TheMealDB search term (real, dish-accurate photos).
const MEAL_SEARCH: Record<string, string> = {
  "Soy-glazed chicken thighs with garlic rice":           "teriyaki chicken",
  "Chicken thigh and potato traybake":                    "roast chicken",
  "Pan-fried chicken breast with garlic and lemon butter":"chicken lemon",
  "Chicken breast soy stir fry":                          "chicken stir fry",
  "Spiced tomato eggs (shakshuka)":                       "shakshuka",
  "Egg fried rice":                                       "egg fried rice",
  "Garlic butter pasta":                                  "spaghetti aglio olio",
  "Beef mince tacos":                                     "tacos",
  "Salmon with soy glaze":                                "salmon",
  "Bacon and egg pasta":                                  "spaghetti carbonara",
  "Spiced chickpea curry":                                "chickpea curry",
  "Lentil soup":                                          "lentil soup",
  "Potato and onion hash with eggs":                      "potato hash",
  "Pan-seared steak with garlic butter":                  "beef steak",
  "Spiced lamb with rice":                                "lamb",
  "Pork chops with garlic butter":                        "pork chops",
};

// For AI-generated names not in the map: search TheMealDB by the dish's main
// keyword so we still get a real, on-topic photo (chicken dish, pasta dish, …).
// Proteins come first so "chicken biryani" resolves to chicken, not rice.
const FOOD_KEYWORDS = [
  "chicken","beef","steak","pork","bacon","sausage","lamb","salmon","tuna","fish",
  "prawn","shrimp","tofu","chickpea","lentil","paneer","egg","pasta","noodle",
  "rice","curry","soup","stew","taco","burger","pizza","risotto","stir fry",
  "potato","mushroom","bean",
];

// Dish-style words → a base term TheMealDB actually has photos for. Lets novel
// AI names ("Garlic & Rosemary Pilaf", "Potato Gratin") still resolve to a real,
// on-topic dish photo instead of the generic placeholder.
const DISH_SYNONYMS: Record<string, string> = {
  pilaf: "rice", pilau: "rice", biryani: "rice", paella: "rice", jambalaya: "rice", "fried rice": "rice",
  carbonara: "pasta", bolognese: "pasta", lasagne: "pasta", lasagna: "pasta", spaghetti: "pasta",
  linguine: "pasta", penne: "pasta", gnocchi: "pasta", tagliatelle: "pasta",
  ramen: "noodle", pho: "noodle", udon: "noodle", "stir-fry": "stir fry",
  gratin: "potato", dauphinoise: "potato", traybake: "potato", hash: "potato", mash: "potato", wedges: "potato",
  dal: "lentil", daal: "lentil", dhal: "lentil",
  frittata: "egg", omelette: "egg", omelet: "egg", scramble: "egg", shakshuka: "shakshuka",
  korma: "curry", masala: "curry", vindaloo: "curry", tikka: "curry", tagine: "stew",
  casserole: "stew", hotpot: "stew", chowder: "soup", bisque: "soup", broth: "soup",
  meatball: "beef", meatloaf: "beef", schnitzel: "chicken", cutlet: "chicken",
  falafel: "chickpea", hummus: "chickpea", fajita: "taco", quesadilla: "taco",
  enchilada: "taco", burrito: "taco",
};

function mealQuery(name: string): string {
  if (MEAL_SEARCH[name]) return MEAL_SEARCH[name];
  const lower = name.toLowerCase();
  // A concrete protein/base keyword wins (most on-topic photo)…
  const kw = FOOD_KEYWORDS.find((k) => lower.includes(k));
  if (kw) return kw;
  // …otherwise map a dish-style word to something TheMealDB can return.
  const syn = Object.keys(DISH_SYNONYMS).find((k) => lower.includes(k));
  if (syn) return DISH_SYNONYMS[syn];
  return name.split(" ").slice(0, 2).join(" ");
}

async function fetchMealDbImage(recipeName: string, signal: AbortSignal): Promise<string | null> {
  const url = `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(mealQuery(recipeName))}`;
  try {
    const r = await fetch(url, { signal });
    if (!r.ok) return null;
    const data = (await r.json()) as { meals: { strMealThumb: string }[] | null };
    return data.meals?.[0]?.strMealThumb ?? null;
  } catch {
    return null;
  }
}

// A relevant dish emoji to bob while the photo loads (echoes the find-recipes loader).
function loaderEmoji(cuisine: string, name: string): string {
  const l = `${cuisine} ${name}`.toLowerCase();
  if (/(pasta|noodle|spaghetti|italian)/.test(l)) return "🍝";
  if (/(rice|curry|indian|thai|biryani)/.test(l)) return "🍛";
  if (/(soup|stew|broth|ramen)/.test(l)) return "🍲";
  if (/(salmon|fish|tuna|prawn|shrimp|seafood)/.test(l)) return "🐟";
  if (/(steak|beef|lamb|pork|chop)/.test(l)) return "🥩";
  if (/(egg|shakshuka|breakfast)/.test(l)) return "🍳";
  if (/(taco|mexican)/.test(l)) return "🌮";
  return "🍽️";
}

type Stage = "mealdb" | "local";

export function RecipeImage({
  src: _src,   // pollinations URLs are dead (HTTP 402) — intentionally unused
  cuisine,
  alt,
  height,
  children,
  className,
  fit = "cover",
}: {
  src?: string;
  cuisine: string;
  alt: string;
  // Omit height and pass an aspect-ratio class (e.g. "aspect-square") instead
  // when you want the frame to track the image rather than crop to a fixed bar.
  height?: number;
  children?: React.ReactNode;
  className?: string;
  fit?: "cover" | "contain";
}) {
  const fallbackGrad = CUISINE_FALLBACK[cuisine] ?? "from-[#3a2a10] to-[#1a0f04]";

  const [stage,      setStage]      = useState<Stage>("mealdb");
  const [displaySrc, setDisplaySrc] = useState<string | null>(null);
  const [loaded,     setLoaded]     = useState(false);
  const [noPhoto,    setNoPhoto]    = useState(false);

  // Reset to the primary stage whenever the recipe changes.
  useEffect(() => {
    setStage("mealdb");
    setLoaded(false);
    setDisplaySrc(null);
    setNoPhoto(false);
  }, [alt]);

  // Resolve the image for the current stage.
  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();
    setLoaded(false);
    setDisplaySrc(null);

    if (stage === "mealdb") {
      fetchMealDbImage(alt, ctrl.signal).then((imgUrl) => {
        if (cancelled) return;
        if (imgUrl) setDisplaySrc(imgUrl);
        else        setStage("local");
      });
    } else {
      // No real photo found — show an intentional gradient + dish-emoji panel
      // rather than a generic "no image" placeholder.
      setNoPhoto(true);
    }

    return () => { cancelled = true; ctrl.abort(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, alt]);

  const handleLoad  = () => setLoaded(true);
  const handleError = () => {
    if (stage === "mealdb") setStage("local");
  };

  return (
    <div
      className={cn("relative w-full overflow-hidden bg-bg-overlay", className)}
      style={height != null ? { height } : undefined}
    >
      {/* Warm cuisine gradient — always visible under/before the photo */}
      <div className={cn("absolute inset-0 bg-gradient-to-br", fallbackGrad)} />

      {/* Loader — shimmer + a bobbing dish (echoes the recipe-finding loader) */}
      {!loaded && !noPhoto && (
        <div className="absolute inset-0">
          <div className="absolute inset-0 skeleton opacity-60" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[40px] animate-food-bob drop-shadow-lg select-none">
              {loaderEmoji(cuisine, alt)}
            </span>
          </div>
        </div>
      )}

      {/* No-photo fallback — warm gradient with a large dish emoji, reads as
          intentional rather than a broken image. */}
      {noPhoto && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[56px] drop-shadow-lg select-none opacity-90">
            {loaderEmoji(cuisine, alt)}
          </span>
        </div>
      )}

      {displaySrc && (
        <img
          key={displaySrc}
          src={displaySrc}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            "absolute inset-0 w-full h-full transition-opacity duration-500",
            fit === "contain" ? "object-contain" : "object-cover",
            loaded ? "opacity-100" : "opacity-0"
          )}
        />
      )}

      {/* Darkening vignette only when text is overlaid on the photo */}
      {children && (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60 pointer-events-none" />
          <div className="absolute inset-0 flex flex-col justify-end">{children}</div>
        </>
      )}
    </div>
  );
}
