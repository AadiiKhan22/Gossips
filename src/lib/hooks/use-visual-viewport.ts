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
 * Important: this hook is now ONLY meant to be consulted while a
 * keyboard is genuinely open (see `isKeyboardOpen`). For normal sizing,
 * prefer the CSS `dvh` unit instead of `window.innerHeight` — on iOS,
 * especially in an installed/standalone PWA, `window.innerHeight` does
 * not reliably include the safe-area strip the home indicator sits in,
 * while `dvh` (dynamic viewport height) is specifically designed by
 * browser vendors to always match the true visible screen. Using
 * `window.innerHeight` as a "safe" fallback here previously left a gap
 * above the home indicator in standalone mode.
 */
export function useVisualViewport() {
  // Start with a value that matches what the server rendered (there is
  // no `window` on the server), then sync to the real viewport only
  // after mount. Reading window.innerHeight directly in the initial
  // state would make the client's first render differ from the
  // server-rendered HTML and trigger a hydration mismatch.
  const [viewport, setViewport] = React.useState({ height: 0, offsetTop: 0, isKeyboardOpen: false });

  React.useEffect(() => {
    const vv = window.visualViewport;

    if (!vv) {
      // No VisualViewport API support: nothing to correct for, let CSS
      // `dvh` handle sizing and never report a keyboard override.
      return;
    }

    // A real on-screen keyboard shrinks the visual viewport by a lot
    // (typically 250px+) and/or scrolls it (offsetTop > 0). A shrink
    // smaller than this is just Safari's own toolbar showing/hiding in
    // a plain browser tab, not a keyboard — ignore it and let CSS `dvh`
    // keep controlling layout height in that case.
    const KEYBOARD_SHRINK_THRESHOLD_PX = 150;

    function update() {
      if (!vv) return;
      const shrunk = window.innerHeight - vv.height;
      const isKeyboardOpen = vv.offsetTop > 0 || shrunk > KEYBOARD_SHRINK_THRESHOLD_PX;
      setViewport({ height: vv.height, offsetTop: vv.offsetTop, isKeyboardOpen });
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
