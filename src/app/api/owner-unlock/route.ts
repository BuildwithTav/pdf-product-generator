import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { assertHeaderSafeEnv } from "@/lib/env-guard";

// Visiting /api/owner-unlock?token=<OWNER_BYPASS_TOKEN> once sets a
// long-lived cookie that exempts this browser from every payment check
// (see requirePaidProject in api-helpers.ts) — no login, just a secret
// link only the owner has.
export async function GET(request: Request) {
  const token = process.env.OWNER_BYPASS_TOKEN?.trim();
  if (!token) {
    return NextResponse.json({ error: "OWNER_BYPASS_TOKEN is not set." }, { status: 500 });
  }
  assertHeaderSafeEnv("OWNER_BYPASS_TOKEN", token);

  const { searchParams } = new URL(request.url);
  const provided = searchParams.get("token");

  if (!provided || provided !== token) {
    return NextResponse.json({ error: "Invalid token." }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set("owner_bypass", "1", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365 * 10,
    path: "/",
  });

  return NextResponse.redirect(new URL("/new", request.url));
}
