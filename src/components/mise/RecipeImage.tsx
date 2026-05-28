import { useState } from "react";
import { cn } from "@/lib/utils";

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
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const fallback = CUISINE_FALLBACK[cuisine] ?? "from-[#3a2a10] to-[#1a0f04]";

  return (
    <div
      className={cn("relative w-full overflow-hidden bg-bg-overlay", className)}
      style={{ height }}
    >
      {/* Shimmer placeholder */}
      {!loaded && !errored && (
        <div className="absolute inset-0 skeleton" />
      )}

      {/* Fallback gradient */}
      {errored && (
        <div className={cn("absolute inset-0 bg-gradient-to-br", fallback)} />
      )}

      {/* Actual image */}
      {src && !errored && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-opacity duration-500",
            loaded ? "opacity-100" : "opacity-0"
          )}
        />
      )}

      {/* Dark gradient overlay (transparent → 60% black) */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60 pointer-events-none" />

      {/* Overlay content */}
      {children && (
        <div className="absolute inset-0 flex flex-col justify-end">{children}</div>
      )}
    </div>
  );
}