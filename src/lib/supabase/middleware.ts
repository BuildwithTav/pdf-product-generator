import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { assertHeaderSafeEnv } from "@/lib/env-guard";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  assertHeaderSafeEnv("NEXT_PUBLIC_SUPABASE_URL", url);
  assertHeaderSafeEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", anonKey);

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // There's no login screen — every visitor silently gets their own
    // anonymous Supabase session on first request, so their drafts are
    // scoped to their browser via RLS without ever seeing an auth form.
    // Requires "Allow anonymous sign-ins" enabled in the Supabase project.
    await supabase.auth.signInAnonymously();
  }

  return response;
}
