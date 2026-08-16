import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { email } = await request.json();

  if (typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const admin = createServiceRoleClient();
  const { data: allowed } = await admin
    .from("allowed_emails")
    .select("email")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (!allowed) {
    // Don't reveal whether the email exists in the allowlist.
    return NextResponse.json({
      ok: true,
      message: "If that email is on the member list, a sign-in link is on its way.",
    });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: "If that email is on the member list, a sign-in link is on its way.",
  });
}
