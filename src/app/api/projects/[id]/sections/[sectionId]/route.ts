import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, errorResponse } from "@/lib/api-helpers";
import { generateSectionContent, sectionsToSkeleton } from "@/lib/prompts";
import { MAX_REGENERATIONS_PER_SECTION } from "@/lib/anthropic";
import type { Section } from "@/types/db";

const GenerateSchema = z.object({
  instruction: z.string().trim().max(500).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  const { id, sectionId } = await params;
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => ({}));
  const parsed = GenerateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const [{ data: project, error: projectError }, { data: allSections, error: sectionsError }] =
    await Promise.all([
      supabase.from("projects").select("*").eq("id", id).single(),
      supabase.from("sections").select("*").eq("project_id", id).order("order_index"),
    ]);

  if (projectError || !project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  if (sectionsError) return errorResponse(sectionsError);

  const section = (allSections as Section[]).find((s) => s.id === sectionId);
  if (!section) return NextResponse.json({ error: "Section not found" }, { status: 404 });

  const isRegeneration = section.status !== "pending";
  if (isRegeneration && section.regenerate_count >= MAX_REGENERATIONS_PER_SECTION) {
    return NextResponse.json(
      { error: `This section has hit the regeneration limit (${MAX_REGENERATIONS_PER_SECTION}).` },
      { status: 429 }
    );
  }

  await supabase.from("sections").update({ status: "generating" }).eq("id", sectionId);

  try {
    const content = await generateSectionContent({
      brief: {
        productName: project.product_name,
        niche: project.niche,
        audience: project.audience,
        corePromise: project.core_promise,
        toneReference: project.tone_reference,
        chapterCountRequested: project.chapter_count_requested,
      },
      fullSkeleton: sectionsToSkeleton(allSections as Section[]),
      section: { title: section.title, summary: section.summary },
      sectionIndex: section.order_index,
      regenerationNote: parsed.data.instruction,
    });

    const { data: updated, error: updateError } = await supabase
      .from("sections")
      .update({
        content,
        status: "generated",
        regenerate_count: isRegeneration ? section.regenerate_count + 1 : section.regenerate_count,
      })
      .eq("id", sectionId)
      .select("*")
      .single();

    if (updateError) return errorResponse(updateError);
    return NextResponse.json({ section: updated });
  } catch (err) {
    await supabase.from("sections").update({ status: section.status }).eq("id", sectionId);
    return errorResponse(err, "Failed to generate section content.");
  }
}

const PatchSchema = z.object({
  content: z.string().max(20000).optional(),
  status: z.enum(["generated", "approved"]).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  const { sectionId } = await params;
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const body = await request.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("sections")
    .update(parsed.data)
    .eq("id", sectionId)
    .select("*")
    .single();

  if (error) return errorResponse(error);
  return NextResponse.json({ section: data });
}
