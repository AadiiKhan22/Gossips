import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { getRequestOrigin } from "@/lib/request-origin";
import { createClient } from "@/lib/supabase/server";

// Email confirmation link handler. Uses token_hash + verifyOtp, so it works
// even when the link is opened on a different device/browser than signup.
//
// This is a one-time-use link: the token can only be verified successfully
// once. We mark every response no-store so Safari/iOS, a CDN, or a corporate
// link-scanning proxy never serves a cached copy of this route back to a
// second visitor (which would look like "the link doesn't work").
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = getRequestOrigin(request);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

    if (!error) {
      const response = NextResponse.redirect(`${origin}${next.startsWith("/") ? next : "/"}`);
      response.headers.set("Cache-Control", "no-store");
      return response;
    }
  }

  const response = NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
