// Behind a proxy (ngrok, Vercel) request.url can show localhost, so build the
// public origin from the forwarded headers instead.
export function getRequestOrigin(request: Request) {
  const headers = request.headers;
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  if (!host) {
    return new URL(request.url).origin;
  }
  const proto =
    headers.get("x-forwarded-proto")?.split(",")[0] ??
    (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
