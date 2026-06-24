import { useEffect, useState } from "react";

/** Tracks the visible viewport — shrinks when the mobile keyboard opens. */
export function useVisualViewport() {
  const [height, setHeight] = useState<number | null>(null);
  const [offsetTop, setOffsetTop] = useState(0);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) {
      setHeight(window.innerHeight);
      return;
    }

    const update = () => {
      setHeight(vv.height);
      setOffsetTop(vv.offsetTop);
      // Keyboard typically consumes ~35%+ of the screen height.
      setKeyboardOpen(vv.height < window.innerHeight * 0.82);
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    window.addEventListener("orientationchange", update);

    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return { height, offsetTop, keyboardOpen };
}
