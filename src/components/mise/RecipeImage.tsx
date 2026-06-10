import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

// Warm per-cuisine gradient sits UNDER every image so there's never a flat black
// flash and the skeleton/placeholder always reads as on-brand.
const CUISINE_FALLBACK: Record<string, string> = {
  Italian: "from-[#5a3a10] to-[#2a1a08]",
  Japanese: "from-[#1d3a2a] to-[#0a1f14]",
  Mexican: "from-[#5a2a10] to-[#2a1404]",
  Asian: "from-[#3a1a08] to-[#1a0a04]",
  Chinese: "from-[#4a1a10] to-[#1f0805]",
  Thai: "from-[#1f4a2a] to-[#0a1f12]",
  Indian: "from-[#5a3a08] to-[#2a1a04]",
  "Middle Eastern": "from-[#4a2a08] to-[#1f1004]",
  Mediterranean: "from-[#1a3a4a] to-[#08191f]",
  American: "from-[#4a1a1a] to-[#1f0808]",
};

const LOCAL_FALLBACK = "/recipe-fallback.svg"; // bundled, 100% available

// picsum.photos — reliable CDN with proper MIME types, no ORB issues.
// Uses a deterministic seed so the same recipe always shows the same photo.
function stockPhoto(cuisine: string, alt: string): string {
  const seed = `${cuisine}-${alt}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/800/500`;
}

// Detect and replace AI-image URLs that are known to trigger ERR_BLOCKED_BY_ORB
// (pollinations.ai serves non-image MIME types on first response, Chrome blocks it).
// Swap for a consistent picsum photo using the seed already embedded in the URL.
function sanitiseSrc(src: string | undefined): string | undefined {
  if (!src) return undefined;
  if (src.includes("pollinations.ai")) {
    const m = src.match(/seed=(\d+)/);
    const n = m ? m[1] : String(src.length);
    return `https://picsum.photos/seed/mise-recipe-${n}/800/500`;
  }
  return src;
}

type Stage = "primary" | "stock" | "local";

export function RecipeImage({
  src,
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

  // Sanitise the primary src — swap known ORB-blocked origins for picsum
  const safeSrc = sanitiseSrc(src);

  const [stage, setStage] = useState<Stage>(safeSrc ? "primary" : "stock");
  const [loaded, setLoaded] = useState(false);
  const loadedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeSrc =
    stage === "primary" ? safeSrc : stage === "stock" ? stockPhoto(cuisine, alt) : LOCAL_FALLBACK;

  const advance = () => setStage((s) => (s === "primary" ? "stock" : "local"));

  // Reset load state + start a slow-connection timeout whenever the stage changes.
  useEffect(() => {
    setLoaded(false);
    loadedRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (stage === "local") return; // local SVG is instant — no timeout needed
    const ms = stage === "primary" ? 6000 : 8000; // give pollinations 6s, stock 8s
    timerRef.current = setTimeout(() => {
      if (!loadedRef.current) advance();
    }, ms);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [stage]);

  const handleLoad = () => {
    loadedRef.current = true;
    setLoaded(true);
    if (timerRef.current) clearTimeout(timerRef.current);
  };
  const handleError = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    advance();
  };

  return (
    <div
      className={cn("relative w-full overflow-hidden bg-bg-overlay", className)}
      style={{ height }}
    >
      {/* Warm gradient base — always present beneath the image */}
      <div className={cn("absolute inset-0 bg-gradient-to-br", fallbackGrad)} />

      {/* Skeleton shimmer until the current image finishes loading */}
      {!loaded && <div className="absolute inset-0 skeleton" />}

      {/* Image for the current stage (key forces a fresh load per stage) */}
      {activeSrc && (
        <img
          key={stage}
          src={activeSrc}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-opacity duration-500",
            loaded ? "opacity-100" : "opacity-0"
          )}
        />
      )}

      {/* Dark gradient overlay (transparent → 60% black) for legible overlay text */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60 pointer-events-none" />

      {children && <div className="absolute inset-0 flex flex-col justify-end">{children}</div>}
    </div>
  );
}
