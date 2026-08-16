import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { assertHeaderSafeEnv } from "@/lib/env-guard";

export async function createClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  assertHeaderSafeEnv("NEXT_PUBLIC_SUPABASE_URL", url);
  assertHeaderSafeEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", anonKey);

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component without a mutable cookie store.
          // Safe to ignore because middleware refreshes the session.
        }
      },
    },
  });
}
