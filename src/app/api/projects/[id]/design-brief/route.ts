import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, errorResponse } from "@/lib/api-helpers";
import { generateDesignBrief } from "@/lib/prompts";
import { FONT_PAIRINGS, LAYOUT_MOODS, PALETTES } from "@/lib/design-presets";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (projectError || !project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  try {
    const designBrief = await generateDesignBrief({
      productName: project.product_name,
      niche: project.niche,
      audience: project.audience,
      corePromise: project.core_promise,
      toneReference: project.tone_reference,
      chapterCountRequested: project.chapter_count_requested,
    });

    const { data: updated, error } = await supabase
      .from("projects")
      .update({ design_brief: designBrief })
      .eq("id", id)
      .select("*")
      .single();

    if (error) return errorResponse(error);
    return NextResponse.json({ project: updated });
  } catch (err) {
    return errorResponse(err, "Failed to generate design brief.");
  }
}

const PatchSchema = z.object({
  paletteId: z.enum(PALETTES.map((p) => p.id) as [string, ...string[]]).optional(),
  fontPairingId: z.enum(FONT_PAIRINGS.map((f) => f.id) as [string, ...string[]]).optional(),
  layoutMood: z.enum(LAYOUT_MOODS.map((m) => m.id) as [string, ...string[]]).optional(),
  coverImageQuery: z.string().trim().min(1).max(100).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const body = await request.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("design_brief")
    .eq("id", id)
    .single();
  if (projectError || !project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const merged = { ...(project.design_brief ?? {}), ...parsed.data };

  const { data: updated, error } = await supabase
    .from("projects")
    .update({ design_brief: merged })
    .eq("id", id)
    .select("*")
    .single();

  if (error) return errorResponse(error);
  return NextResponse.json({ project: updated });
}
