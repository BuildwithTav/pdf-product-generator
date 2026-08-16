import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, errorResponse } from "@/lib/api-helpers";

export async function GET() {
  const { supabase, user, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { data, error } = await supabase
    .from("business_profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) return errorResponse(error);
  return NextResponse.json({ profile: data });
}

const PatchSchema = z.object({
  background: z.string().trim().max(1000).optional(),
  audienceHint: z.string().trim().max(500).optional(),
  interests: z.string().trim().max(500).optional(),
});

export async function PATCH(request: Request) {
  const { supabase, user, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const body = await request.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("business_profiles")
    .upsert(
      {
        id: user.id,
        ...(parsed.data.background !== undefined && { background: parsed.data.background }),
        ...(parsed.data.audienceHint !== undefined && { audience_hint: parsed.data.audienceHint }),
        ...(parsed.data.interests !== undefined && { interests: parsed.data.interests }),
      },
      { onConflict: "id" }
    )
    .select("*")
    .single();

  if (error) return errorResponse(error);
  return NextResponse.json({ profile: data });
}
