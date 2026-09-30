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
 *
 * One caveat this hook corrects for: in a normal Safari *browser tab*
 * (not an installed/standalone PWA), `visualViewport.height` excludes
 * Safari's own bottom toolbar — even though that toolbar isn't actually
 * covering our page, just sitting below it. Sizing our fixed app shell
 * to that shorter height leaves a visible gap between our bottom nav
 * and the real edge of the screen. We only trust visualViewport's
 * shrink when it's shrinking from the *top* (offsetTop > 0, which is
 * the real keyboard-covers-content case this hook exists for) or when
 * it's shrunk by more than a small browser-chrome-sized amount (a
 * genuine keyboard, not a toolbar). Otherwise we fall back to the full
 * layout viewport height so the shell reaches the true bottom edge.
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

    // A small shrink relative to the full layout viewport is Safari's
    // toolbar, not a keyboard — a real on-screen keyboard takes up far
    // more than this on any device.
    const TOOLBAR_SLOP_PX = 120;

    function update() {
      if (!vv) return;
      const shrunk = window.innerHeight - vv.height;
      const looksLikeKeyboard = vv.offsetTop > 0 || shrunk > TOOLBAR_SLOP_PX;
      setViewport(
        looksLikeKeyboard
          ? { height: vv.height, offsetTop: vv.offsetTop }
          : { height: window.innerHeight, offsetTop: 0 },
      );
    }

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return viewport;
}
