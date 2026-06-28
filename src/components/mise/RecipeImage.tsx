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

const LOCAL_FALLBACK = "/recipe-fallback.svg";

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
const FOOD_KEYWORDS = [
  "chicken","beef","steak","pork","bacon","sausage","lamb","salmon","tuna","fish",
  "prawn","shrimp","tofu","chickpea","lentil","paneer","egg","pasta","noodle",
  "rice","curry","soup","stew","taco","burger","pizza","risotto","stir fry",
  "potato","mushroom","bean",
];
function mealQuery(name: string): string {
  if (MEAL_SEARCH[name]) return MEAL_SEARCH[name];
  const lower = name.toLowerCase();
  const kw = FOOD_KEYWORDS.find((k) => lower.includes(k));
  return kw ?? name.split(" ").slice(0, 2).join(" ");
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
  height = 220,
  children,
  className,
}: {
  src?: string;
  cuisine: string;
  alt: string;
  height?: number;
  children?: React.ReactNode;
  className?: string;
}) {
  const fallbackGrad = CUISINE_FALLBACK[cuisine] ?? "from-[#3a2a10] to-[#1a0f04]";

  const [stage,      setStage]      = useState<Stage>("mealdb");
  const [displaySrc, setDisplaySrc] = useState<string | null>(null);
  const [loaded,     setLoaded]     = useState(false);

  // Reset to the primary stage whenever the recipe changes.
  useEffect(() => {
    setStage("mealdb");
    setLoaded(false);
    setDisplaySrc(null);
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
      setDisplaySrc(LOCAL_FALLBACK);
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
      style={{ height }}
    >
      {/* Warm cuisine gradient — always visible under/before the photo */}
      <div className={cn("absolute inset-0 bg-gradient-to-br", fallbackGrad)} />

      {/* Loader — shimmer + a bobbing dish (echoes the recipe-finding loader) */}
      {!loaded && (
        <div className="absolute inset-0">
          <div className="absolute inset-0 skeleton opacity-60" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[40px] animate-food-bob drop-shadow-lg select-none">
              {loaderEmoji(cuisine, alt)}
            </span>
          </div>
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
            "absolute inset-0 w-full h-full object-cover transition-opacity duration-500",
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
