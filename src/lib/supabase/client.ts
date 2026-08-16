import { createBrowserClient } from "@supabase/ssr";
import { assertHeaderSafeEnv } from "@/lib/env-guard";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  assertHeaderSafeEnv("NEXT_PUBLIC_SUPABASE_URL", url);
  assertHeaderSafeEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", anonKey);
  return createBrowserClient(url, anonKey);
}
