import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user?.email) {
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
  }

  const normalizedEmail = data.user.email.toLowerCase();
  const admin = createServiceRoleClient();
  const { data: allowed } = await admin
    .from("allowed_emails")
    .select("email")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (!allowed) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/auth/auth-code-error?reason=not_a_member`);
  }

  await admin
    .from("profiles")
    .upsert({ id: data.user.id, email: normalizedEmail }, { onConflict: "id" });

  return NextResponse.redirect(`${origin}${next}`);
}
