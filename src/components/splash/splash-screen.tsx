"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { GossipsLogo } from "@/components/brand/gossips-logo";

interface SplashScreenProps {
  redirectTo: string;
  delayMs?: number;
}

export function SplashScreen({ redirectTo, delayMs = 1500 }: SplashScreenProps) {
  const router = useRouter();

  useEffect(() => {
    document.cookie = "gossips_splash_shown=1; path=/; SameSite=Lax";
    // Warm up the next page while the splash is showing.
    router.prefetch(redirectTo);
    // Count the delay from when the page started loading, so the total
    // splash time is ~1.5s no matter how long hydration took.
    const remaining = Math.max(0, delayMs - performance.now());
    const timer = setTimeout(() => {
      router.replace(redirectTo);
    }, remaining);
    return () => clearTimeout(timer);
  }, [router, redirectTo, delayMs]);

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center gap-6 overflow-hidden bg-[linear-gradient(135deg,#a91d18,#d1495b)] text-gossip-foreground dark:bg-[linear-gradient(180deg,#050b18_0%,#0a1a3a_55%,#0b2a63_100%)]">
      {/* Dark-mode waves */}
      <svg
        aria-hidden
        viewBox="0 0 400 300"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-[38%] w-full dark:block"
      >
        <path d="M0 120 C90 40 170 90 250 130 C320 165 370 120 400 90 L400 300 L0 300 Z" fill="#0d2f6e" opacity="0.55" />
        <path d="M0 190 C80 130 170 170 240 200 C310 230 360 190 400 160 L400 300 L0 300 Z" fill="#0a4ab5" opacity="0.5" />
        <path d="M0 250 C100 210 200 250 290 240 C340 235 375 220 400 210 L400 300 L0 300 Z" fill="#0b1f4a" opacity="0.9" />
      </svg>

      {/* Logo: red app icon in light mode, blue chat bubbles in dark mode */}
      <div className="relative z-10 dark:hidden">
        <GossipsLogo size="xl" showText={false} className="drop-shadow-lg" />
      </div>
      <svg
        aria-hidden
        viewBox="0 0 120 100"
        className="relative z-10 hidden h-24 w-28 drop-shadow-[0_0_24px_rgba(59,130,246,0.45)] dark:block"
      >
        <defs>
          <linearGradient id="bubbleA" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#4aa3ff" />
            <stop offset="1" stopColor="#1d6fe0" />
          </linearGradient>
          <linearGradient id="bubbleB" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#2b7de9" />
            <stop offset="1" stopColor="#0f4bb8" />
          </linearGradient>
        </defs>
        <path d="M12 18 Q12 4 30 4 H60 Q78 4 78 22 V40 Q78 58 60 58 H38 L22 70 V58 Q12 56 12 42 Z" fill="url(#bubbleA)" />
        <path d="M48 36 Q48 24 64 24 H92 Q108 24 108 40 V56 Q108 72 94 74 V88 L78 76 H64 Q48 76 48 60 Z" fill="url(#bubbleB)" opacity="0.95" />
      </svg>

      <div className="relative z-10 flex flex-col items-center gap-1.5">
        <h1 className="text-4xl font-bold tracking-tight dark:text-[#3b8cf0]">Gossips</h1>
        <p className="text-sm opacity-90 dark:text-[#e5ecf7] dark:opacity-100">
          More Chats &nbsp;•&nbsp;{" "}
          <span className="dark:text-[#4aa3ff]">More Moments</span>
        </p>
      </div>
    </div>
  );
}
