"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const SPLASH_KEY = "gossips_splash_shown";

export function SplashGate() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/splash")) return;

    const alreadyShown = sessionStorage.getItem(SPLASH_KEY);
    if (!alreadyShown) {
      router.replace("/splash");
    }
  }, [pathname, router]);

  return null;
}
