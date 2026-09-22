import { NextResponse } from "next/server";

// Fallback STUN-only servers used if Metered can't be reached, so calls
// still have a chance on networks that don't need a TURN relay.
const FALLBACK_ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export async function GET() {
  const apiKey = process.env.METERED_TURN_API_KEY;
  const domain = process.env.METERED_TURN_DOMAIN;

  if (!apiKey || !domain) {
    console.error("Gossips TURN: missing env vars", { hasApiKey: Boolean(apiKey), domain });
    return NextResponse.json({ iceServers: FALLBACK_ICE_SERVERS, debug: "missing_env" });
  }

  try {
    const url = `https://${domain}/api/v1/turn/credentials?apiKey=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      const body = await response.text();
      console.error("Gossips TURN: Metered responded with error", response.status, body);
      return NextResponse.json({
        iceServers: FALLBACK_ICE_SERVERS,
        debug: `metered_status_${response.status}`,
      });
    }

    const iceServers = await response.json();
    return NextResponse.json({ iceServers });
  } catch (error) {
    console.error("Gossips TURN: fetch threw", error);
    return NextResponse.json({ iceServers: FALLBACK_ICE_SERVERS, debug: "fetch_threw" });
  }
}
