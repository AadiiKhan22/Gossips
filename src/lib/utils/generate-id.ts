/**
 * `crypto.randomUUID()` only exists in "secure contexts" (HTTPS or
 * localhost). When testing over plain HTTP on a LAN IP (e.g. from a
 * phone during local development), it's undefined and throws. This
 * falls back to `crypto.getRandomValues` (available in more contexts)
 * and finally to `Math.random` if neither exists.
 */
export function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  // Last-resort fallback: not cryptographically strong, but fine for a
  // storage filename where we just need low collision odds.
  return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
