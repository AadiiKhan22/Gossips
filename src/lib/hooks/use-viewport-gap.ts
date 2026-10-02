"use client";

import * as React from "react";

/**
 * Gap (px) between the physical screen bottom and the page area in an
 * installed iOS web app, where the page can end above the home-indicator
 * zone. Subtract it from `env(safe-area-inset-bottom)` so bottom UI isn't
 * pushed up by space that is already outside the page.
 *
 * Single source of truth for bottom safe-area spacing: used by the chat
 * list's bottom nav and the chat screen's message composer.
 */
export function useViewportGap() {
  const [gap, setGap] = React.useState(0);

  React.useEffect(() => {
    function measure() {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
      const diff = window.screen.height - window.innerHeight;
      setGap(standalone && diff > 0 && diff <= 80 ? Math.round(diff) : 0);
    }
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, []);

  return gap;
}
