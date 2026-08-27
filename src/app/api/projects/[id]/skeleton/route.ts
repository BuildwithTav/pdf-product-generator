import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requirePaidProject, errorResponse } from "@/lib/api-helpers";
import { generateSkeleton } from "@/lib/prompts";
import { MAX_SECTIONS } from "@/lib/anthropic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const paidCheck = await requirePaidProject(supabase, id);
  if (!paidCheck.ok) return paidCheck.response;

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    const skeleton = await generateSkeleton({
      productName: project.product_name,
      niche: project.niche,
      audience: project.audience,
      corePromise: project.core_promise,
      toneReference: project.tone_reference,
      chapterCountRequested: project.chapter_count_requested,
      problem: project.problem,
      transformation: project.transformation,
      format: project.format,
      purpose: project.purpose,
    });

    const capped = skeleton.slice(0, MAX_SECTIONS);

    await supabase.from("sections").delete().eq("project_id", id);

    const { data: sections, error: insertError } = await supabase
      .from("sections")
      .insert(
        capped.map((s, i) => ({
          project_id: id,
          order_index: i,
          title: s.title,
          summary: s.summary,
          icon: s.icon,
          status: "pending" as const,
        }))
      )
      .select("*")
      .order("order_index");

    if (insertError) return errorResponse(insertError);

    await supabase.from("projects").update({ status: "writing" }).eq("id", id);

    return NextResponse.json({ sections });
  } catch (err) {
    return errorResponse(err, "Failed to generate skeleton.");
  }
}

const SectionEditSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(200),
  summary: z.string().trim().max(500).default(""),
});

const PatchSchema = z.object({
  sections: z.array(SectionEditSchema).min(1).max(MAX_SECTIONS),
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

  const { data: existing, error: existingError } = await supabase
    .from("sections")
    .select("id")
    .eq("project_id", id);
  if (existingError) return errorResponse(existingError);

  const keepIds = new Set(parsed.data.sections.map((s) => s.id).filter(Boolean));
  const toDelete = existing.filter((s) => !keepIds.has(s.id)).map((s) => s.id);
  if (toDelete.length) {
    await supabase.from("sections").delete().in("id", toDelete);
  }

  // Two-phase order_index update avoids colliding with the unique
  // (project_id, order_index) constraint while reordering.
  const updates = parsed.data.sections.map((s, i) => ({ ...s, order_index: i }));

  for (const [i, s] of updates.entries()) {
    if (s.id) {
      await supabase
        .from("sections")
        .update({ order_index: -(i + 1) })
        .eq("id", s.id);
    }
  }

  const results = [];
  for (const s of updates) {
    if (s.id) {
      const { data, error } = await supabase
        .from("sections")
        .update({ title: s.title, summary: s.summary, order_index: s.order_index })
        .eq("id", s.id)
        .select("*")
        .single();
      if (error) return errorResponse(error);
      results.push(data);
    } else {
      const { data, error } = await supabase
        .from("sections")
        .insert({
          project_id: id,
          title: s.title,
          summary: s.summary,
          order_index: s.order_index,
          status: "pending",
        })
        .select("*")
        .single();
      if (error) return errorResponse(error);
      results.push(data);
    }
  }

  return NextResponse.json({ sections: results.sort((a, b) => a.order_index - b.order_index) });
}
