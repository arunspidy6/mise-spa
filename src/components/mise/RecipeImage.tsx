import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

// Warm per-cuisine gradient sits UNDER every image so there's never a flat black
// flash and the skeleton/placeholder always reads as on-brand.
const CUISINE_FALLBACK: Record<string, string> = {
  Italian:         "from-[#5a3a10] to-[#2a1a08]",
  Japanese:        "from-[#1d3a2a] to-[#0a1f14]",
  Mexican:         "from-[#5a2a10] to-[#2a1404]",
  Asian:           "from-[#3a1a08] to-[#1a0a04]",
  Chinese:         "from-[#4a1a10] to-[#1f0805]",
  Thai:            "from-[#1f4a2a] to-[#0a1f12]",
  Indian:          "from-[#5a3a08] to-[#2a1a04]",
  "Middle Eastern":"from-[#4a2a08] to-[#1f1004]",
  Mediterranean:   "from-[#1a3a4a] to-[#08191f]",
  American:        "from-[#4a1a1a] to-[#1f0808]",
};

const LOCAL_FALLBACK = "/recipe-fallback.svg"; // bundled, 100% available

// picsum fallback — consistent seed per recipe, used only if primary fetch fails
function stockPhoto(cuisine: string, alt: string): string {
  const seed = `${cuisine}-${alt}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/800/500`;
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

  const [stage, setStage]       = useState<Stage>(src ? "primary" : "stock");
  const [displaySrc, setDisplaySrc] = useState<string | null>(null);
  const [loaded, setLoaded]     = useState(false);
  const blobRef = useRef<string | null>(null);

  // Cleanup any object URL when unmounting
  useEffect(() => {
    return () => {
      if (blobRef.current) URL.revokeObjectURL(blobRef.current);
    };
  }, []);

  useEffect(() => {
    setLoaded(false);
    setDisplaySrc(null);

    // Revoke previous blob URL on stage change
    if (blobRef.current) {
      URL.revokeObjectURL(blobRef.current);
      blobRef.current = null;
    }

    if (stage === "primary" && src) {
      // Use fetch → blob to bypass ERR_BLOCKED_BY_ORB on cross-origin AI image
      // URLs (e.g. pollinations.ai). The blob URL is same-origin so Chrome/Safari
      // render it without the ORB security check.
      const ctrl  = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10000); // 10 s timeout

      fetch(src, { signal: ctrl.signal })
        .then(r => {
          if (!r.ok) throw new Error("bad status");
          const ct = r.headers.get("content-type") ?? "";
          if (!ct.startsWith("image/")) throw new Error("not image");
          return r.blob();
        })
        .then(blob => {
          clearTimeout(timer);
          const url = URL.createObjectURL(blob);
          blobRef.current = url;
          setDisplaySrc(url);
          setLoaded(true);
        })
        .catch(() => {
          clearTimeout(timer);
          setStage("stock");
        });

      return () => {
        ctrl.abort();
        clearTimeout(timer);
      };
    }

    if (stage === "stock") {
      setDisplaySrc(stockPhoto(cuisine, alt));
    }

    if (stage === "local") {
      setDisplaySrc(LOCAL_FALLBACK);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, src]);

  const handleLoad  = () => setLoaded(true);
  const handleError = () => setStage(s => (s === "stock" ? "local" : s));

  return (
    <div
      className={cn("relative w-full overflow-hidden bg-bg-overlay", className)}
      style={{ height }}
    >
      {/* Warm gradient base — always present beneath the image */}
      <div className={cn("absolute inset-0 bg-gradient-to-br", fallbackGrad)} />

      {/* Skeleton shimmer until the current image finishes loading */}
      {!loaded && <div className="absolute inset-0 skeleton" />}

      {/* Image element (key forces remount when displaySrc changes) */}
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

      {/* Dark gradient overlay for legible text overlaid on the photo */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60 pointer-events-none" />

      {children && <div className="absolute inset-0 flex flex-col justify-end">{children}</div>}
    </div>
  );
}
