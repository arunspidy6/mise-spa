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

// Maps our recipe names → the best TheMealDB search term.
// TheMealDB is a free food-photo database with real, dish-accurate images.
const MEAL_SEARCH: Record<string, string> = {
  "Soy-glazed chicken thighs with garlic rice":           "teriyaki chicken",
  "Chicken thigh and potato traybake":                    "roast chicken",
  "Pan-fried chicken breast with garlic and lemon butter":"chicken lemon",
  "Chicken breast soy stir fry":                         "chicken stir fry",
  "Spiced tomato eggs (shakshuka)":                      "shakshuka",
  "Egg fried rice":                                      "egg fried rice",
  "Garlic butter pasta":                                 "spaghetti aglio olio",
  "Beef mince tacos":                                    "tacos",
  "Salmon with soy glaze":                               "salmon",
  "Bacon and egg pasta":                                 "spaghetti carbonara",
  "Spiced chickpea curry":                               "chickpea curry",
  "Lentil soup":                                         "lentil soup",
  "Potato and onion hash with eggs":                     "potato hash",
  "Pan-seared steak with garlic butter":                 "beef steak",
  "Spiced lamb with rice":                               "lamb",
  "Pork chops with garlic butter":                       "pork chops",
};

// Search TheMealDB for the closest matching food photo.
// Returns the full meal-thumbnail URL, or null on no result / network error.
async function fetchMealDbImage(recipeName: string, signal: AbortSignal): Promise<string | null> {
  const query = MEAL_SEARCH[recipeName] ?? recipeName.split(" ").slice(0, 3).join(" ");
  const url   = `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`;
  try {
    const r    = await fetch(url, { signal });
    if (!r.ok) return null;
    const data = await r.json() as { meals: { strMealThumb: string }[] | null };
    return data.meals?.[0]?.strMealThumb ?? null;
  } catch {
    return null;
  }
}

// Stage order: the dish-matched image from the recipe (pollinations, generated
// for THIS exact dish) is primary; TheMealDB real photo is a fallback; the local
// SVG is the last resort. No random stock photos — every image matches the dish.
type Stage = "src" | "mealdb" | "local";

export function RecipeImage({
  src,         // dish-matched image (recipe.image) — primary source
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

  const [stage,      setStage]      = useState<Stage>(src ? "src" : "mealdb");
  const [displaySrc, setDisplaySrc] = useState<string | null>(null);
  const [loaded,     setLoaded]     = useState(false);
  const blobRef = useRef<string | null>(null);

  // Revoke any blob URL when unmounting
  useEffect(() => {
    return () => { if (blobRef.current) URL.revokeObjectURL(blobRef.current); };
  }, []);

  // When the recipe changes, reset everything back to the primary stage
  useEffect(() => {
    setStage(src ? "src" : "mealdb");
    setLoaded(false);
    setDisplaySrc(null);
    if (blobRef.current) { URL.revokeObjectURL(blobRef.current); blobRef.current = null; }
  }, [alt, src]);

  // Drive image loading based on current stage
  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();

    setLoaded(false);
    setDisplaySrc(null);

    if (stage === "src") {
      setDisplaySrc(src || LOCAL_FALLBACK);
    } else if (stage === "mealdb") {
      fetchMealDbImage(alt, ctrl.signal).then(imgUrl => {
        if (cancelled) return;
        if (imgUrl) setDisplaySrc(imgUrl);
        else         setStage("local");
      });
    } else if (stage === "local") {
      setDisplaySrc(LOCAL_FALLBACK);
    }

    return () => { cancelled = true; ctrl.abort(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, alt, cuisine, src]);

  const handleLoad  = () => setLoaded(true);
  const handleError = () => {
    if (stage === "src") setStage("mealdb");
    else if (stage === "mealdb") setStage("local");
  };

  return (
    <div
      className={cn("relative w-full overflow-hidden bg-bg-overlay", className)}
      style={{ height }}
    >
      {/* Warm cuisine gradient — always visible under/before the photo */}
      <div className={cn("absolute inset-0 bg-gradient-to-br", fallbackGrad)} />

      {/* Skeleton shimmer while the image loads */}
      {!loaded && <div className="absolute inset-0 skeleton" />}

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

      {/* Darkening vignette keeps text overlaid on the photo legible */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60 pointer-events-none" />

      {children && (
        <div className="absolute inset-0 flex flex-col justify-end">{children}</div>
      )}
    </div>
  );
}
