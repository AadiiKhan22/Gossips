"use client";

import * as React from "react";

/**
 * Tracks `window.visualViewport` height and vertical offset.
 *
 * Why this is needed: when the on-screen keyboard opens on iOS Safari,
 * the browser shrinks the *visual* viewport but can also scroll the
 * *layout* viewport upward to keep the focused input visible. Elements
 * positioned with `position: fixed` are pinned to the layout viewport,
 * not the visual one, so they can end up rendered above what's actually
 * visible on screen -- which is why a "fixed" header can disappear
 * above the keyboard. Actively sizing/positioning our app shell to
 * match `visualViewport` sidesteps the bug entirely.
 *
 * Falls back to `window.innerHeight`/0 in environments without the
 * VisualViewport API (older browsers, SSR).
 */
export function useVisualViewport() {
  // Start with a value that matches what the server rendered (there is
  // no `window` on the server), then sync to the real viewport only
  // after mount. Reading window.innerHeight directly in the initial
  // state would make the client's first render differ from the
  // server-rendered HTML and trigger a hydration mismatch.
  const [viewport, setViewport] = React.useState({ height: 0, offsetTop: 0 });

  React.useEffect(() => {
    const vv = window.visualViewport;

    if (!vv) {
      // No VisualViewport API support: fall back to window height and
      // just accept the classic iOS bug can't be worked around here.
      function updateFallback() {
        setViewport({ height: window.innerHeight, offsetTop: 0 });
      }
      updateFallback();
      window.addEventListener("resize", updateFallback);
      return () => window.removeEventListener("resize", updateFallback);
    }

    function update() {
      if (!vv) return;
      setViewport({ height: vv.height, offsetTop: vv.offsetTop });
    }

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return viewport;
}
