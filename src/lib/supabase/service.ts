import { createClient } from "@supabase/supabase-js";
import { assertHeaderSafeEnv } from "@/lib/env-guard";

// Bypasses RLS entirely — only ever used for the small set of writes that
// must never be reachable by a client-side call, even from the resource's
// own owner (payment status, free-code redemption). Never expose this
// client to anything driven by unvalidated request input; the callers
// that use it (Stripe webhook, verify-on-return, redeem-code) each do
// their own check of what they're allowed to write before calling it.
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set.");
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
  assertHeaderSafeEnv("NEXT_PUBLIC_SUPABASE_URL", url);
  assertHeaderSafeEnv("SUPABASE_SERVICE_ROLE_KEY", serviceKey);

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
