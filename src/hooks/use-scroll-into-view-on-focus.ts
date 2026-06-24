import { useCallback, useRef } from "react";

/** Keeps a focused field visible when the mobile keyboard opens. */
export function useScrollIntoViewOnFocus<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  const onFocus = useCallback(() => {
    requestAnimationFrame(() => {
      ref.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  }, []);

  return { ref, onFocus };
}
