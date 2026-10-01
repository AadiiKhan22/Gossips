import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { ThemeProvider } from "@/components/theme/theme-provider";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Gossips",
    template: "%s | Gossips",
  },
  description: "Modern messaging built for private chats, groups, and real-time conversations.",
  applicationName: "Gossips",
  keywords: ["messaging", "chat", "realtime", "gossips"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Gossips",
    statusBarStyle: "black-translucent",
  },
  other: {
    // Next's `appleWebApp.capable` metadata only emits the generic
    // `mobile-web-app-capable` tag, not the iOS-specific one — and iOS
    // Safari ONLY honors `apple-mobile-web-app-capable`, not the
    // generic Android/Chrome tag. Without this exact tag, iOS treats
    // an "Add to Home Screen" install as a glorified bookmark rather
    // than a true standalone app, which is why viewport/safe-area
    // sizing behaved inconsistently. Setting it explicitly here
    // guarantees it's actually present in the rendered <head>.
    "apple-mobile-web-app-capable": "yes",
  },
  icons: {
    icon: [
      { url: "/favicon.ico?v=2", sizes: "any" },
      { url: "/favicon.png?v=2", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico?v=2",
    apple: "/apple-touch-icon.png?v=2",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Lets content extend into the iOS notch/home-indicator area so we can
  // pad it back out with env(safe-area-inset-*) instead of leaving a
  // dead white/black bar. Zoom is intentionally left enabled (no
  // maximumScale/userScalable:false) to keep pinch-zoom accessible.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
