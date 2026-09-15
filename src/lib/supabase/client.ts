import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/utils";

export function createClient() {
  const { url, anonKey } = getSupabaseEnv();

  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase environment variables. Copy .env.example to .env.local and add your credentials.",
    );
  }

  return createBrowserClient(url, anonKey);
}
