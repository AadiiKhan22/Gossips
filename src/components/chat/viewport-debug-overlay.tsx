"use client";

import * as React from "react";

/**
 * TEMPORARY diagnostic overlay. Shows the real numbers the browser is
 * reporting, directly on the device, so we can see actual data instead
 * of guessing. Remove this component once the layout bug is found.
 */
export function ViewportDebugOverlay() {
  const [info, setInfo] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    function update() {
      const vv = window.visualViewport;
      const style = getComputedStyle(document.documentElement);
      setInfo({
        "window.innerHeight": String(window.innerHeight),
        "window.innerWidth": String(window.innerWidth),
        "visualViewport.height": vv ? String(vv.height) : "unsupported",
        "visualViewport.offsetTop": vv ? String(vv.offsetTop) : "unsupported",
        "screen.height": String(window.screen?.height ?? "n/a"),
        "devicePixelRatio": String(window.devicePixelRatio),
        "navigator.standalone": String((window.navigator as unknown as { standalone?: boolean }).standalone),
        "display-mode:standalone": String(window.matchMedia("(display-mode: standalone)").matches),
        "safe-area-inset-bottom": getPropertyValue(style, "--debug-sab"),
        "safe-area-inset-top": getPropertyValue(style, "--debug-sat"),
        "document.documentElement.clientHeight": String(document.documentElement.clientHeight),
        "document.body.clientHeight": String(document.body.clientHeight),
        "document.body.scrollHeight": String(document.body.scrollHeight),
      });
    }

    update();
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    const interval = window.setInterval(update, 1000);
    return () => {
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
      window.clearInterval(interval);
    };
  }, []);

  return (
    <>
      {/* Hidden elements just to read computed safe-area values via CSS */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: 0,
          height: 0,
          overflow: "hidden",
          // @ts-expect-error -- custom property for reading in JS
          "--debug-sat": "env(safe-area-inset-top)",
          "--debug-sab": "env(safe-area-inset-bottom)",
        }}
        id="debug-safe-area-probe"
      />
      <div
        style={{
          position: "fixed",
          top: 4,
          left: 4,
          zIndex: 999999,
          background: "rgba(0,0,0,0.85)",
          color: "#0f0",
          fontSize: 9,
          fontFamily: "monospace",
          padding: 6,
          borderRadius: 6,
          maxWidth: "92vw",
          lineHeight: 1.4,
          pointerEvents: "none",
        }}
      >
        {Object.entries(info).map(([k, v]) => (
          <div key={k}>
            {k}: <b>{v}</b>
          </div>
        ))}
      </div>
    </>
  );
}

function getPropertyValue(style: CSSStyleDeclaration, name: string) {
  const probe = document.getElementById("debug-safe-area-probe");
  if (!probe) return "n/a";
  return getComputedStyle(probe).getPropertyValue(name) || "0 (or unsupported)";
}
