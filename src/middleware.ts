import { updateSession } from "@/lib/supabase/middleware";
import { NextResponse, type NextRequest } from "next/server";

const SPLASH_COOKIE = "gossips_splash_shown";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Show the splash screen first on every fresh browser session, decided
  // on the server so the chat page never flashes before it.
  const isPageRequest =
    request.headers.get("accept")?.includes("text/html") && !request.headers.has("rsc");
  const skipSplash =
    pathname.startsWith("/splash") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/auth");

  if (isPageRequest && !skipSplash && !request.cookies.has(SPLASH_COOKIE)) {
    const url = request.nextUrl.clone();
    url.pathname = "/splash";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
