import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, unauthorized: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  return { supabase, user, unauthorized: null };
}

// The one shared check every generation/regeneration route uses. A project
// is allowed through if it's been paid for (Stripe or a redeemed free
// code, both converge on the same `paid` flag), or if the requesting
// browser carries the owner-bypass cookie (see /api/owner-unlock) — no
// login involved in either path.
export async function requirePaidProject(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string
) {
  const cookieStore = await cookies();
  if (cookieStore.get("owner_bypass")?.value === "1") {
    return { ok: true as const };
  }

  const { data: payment, error } = await supabase
    .from("project_payments")
    .select("paid")
    .eq("project_id", projectId)
    .single();

  if (error || !payment) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Project not found." }, { status: 404 }),
    };
  }

  if (!payment.paid) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Payment required for this project." }, { status: 402 }),
    };
  }

  return { ok: true as const };
}

// Free-tier abuse guard for the two ungated "teaser" calls (/api/ideas,
// /api/research) — these run before a payment exists at all, so they
// can't be gated by requirePaidProject. Capped per requesting IP rather
// than per session, since an anonymous session can be reset for free
// (incognito/clear cookies) but an IP is a real, if imperfect, cost to
// rotate. The owner-bypass cookie exempts the owner from this too.
const FREE_TEASER_CALLS_PER_DAY = 5;

export async function checkTeaserRateLimit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  request: Request
) {
  const cookieStore = await cookies();
  if (cookieStore.get("owner_bypass")?.value === "1") {
    return { ok: true as const };
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown";

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from("teaser_usage")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .gte("created_at", since);

  if (error) {
    // Fail open — a broken rate-limit check shouldn't take down the free
    // teaser for everyone; it just means this one abuse guard is briefly
    // not enforced.
    console.error("Teaser rate limit check failed:", error);
    return { ok: true as const };
  }

  if ((count ?? 0) >= FREE_TEASER_CALLS_PER_DAY) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "You've hit today's free limit. Try again tomorrow, or pay to continue." },
        { status: 429 }
      ),
    };
  }

  await supabase.from("teaser_usage").insert({ ip });
  return { ok: true as const };
}

export function errorResponse(error: unknown, fallback = "Something went wrong.") {
  console.error(error);
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ error: message }, { status: 500 });
}
