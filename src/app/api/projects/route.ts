import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, errorResponse } from "@/lib/api-helpers";

const IntakeSchema = z.object({
  productName: z.string().trim().min(1).max(200),
  niche: z.string().trim().min(1).max(200),
  audience: z.string().trim().min(1).max(300),
  corePromise: z.string().trim().min(1).max(500),
  toneReference: z.string().trim().max(500).optional(),
  chapterCountRequested: z.number().int().min(1).max(20).optional(),
});

export async function GET() {
  const { supabase, user, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) return errorResponse(error);
  return NextResponse.json({ projects: data });
}

export async function POST(request: Request) {
  const { supabase, user, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const body = await request.json();
  const parsed = IntakeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      product_name: parsed.data.productName,
      niche: parsed.data.niche,
      audience: parsed.data.audience,
      core_promise: parsed.data.corePromise,
      tone_reference: parsed.data.toneReference || null,
      chapter_count_requested: parsed.data.chapterCountRequested ?? null,
      status: "draft",
    })
    .select("*")
    .single();

  if (error) return errorResponse(error);
  return NextResponse.json({ project: data }, { status: 201 });
}
