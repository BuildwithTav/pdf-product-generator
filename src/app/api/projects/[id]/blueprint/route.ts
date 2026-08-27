import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requirePaidProject, errorResponse } from "@/lib/api-helpers";
import { generateBlueprint } from "@/lib/prompts";

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

  // The first blueprint generation (project still has no blueprint,
  // status "idea") is part of the free teaser. A second call ("Improve
  // With AI", once status is already "blueprint") is a paid regeneration —
  // unlimited free re-rolls was the actual cost-leakage risk, not the
  // one initial call.
  const isRegeneration = project.status === "blueprint";
  if (isRegeneration) {
    const paidCheck = await requirePaidProject(supabase, id);
    if (!paidCheck.ok) return paidCheck.response;
  }

  try {
    const blueprint = await generateBlueprint({
      productName: project.product_name,
      niche: project.niche,
      audience: project.audience,
      corePromise: project.core_promise,
      problem: project.problem,
      transformation: project.transformation,
      format: project.format,
    });

    const { data: updated, error } = await supabase
      .from("projects")
      .update({
        subtitle: blueprint.subtitle,
        purpose: blueprint.purpose,
        cta_next_step: blueprint.ctaNextStep,
        tone_reference: project.tone_reference || blueprint.tone,
        status: "blueprint",
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) return errorResponse(error);
    return NextResponse.json({
      project: updated,
      contentsPreview: blueprint.contentsPreview,
      tone: blueprint.tone,
    });
  } catch (err) {
    return errorResponse(err, "Failed to generate blueprint.");
  }
}

const PatchSchema = z.object({
  productName: z.string().trim().min(1).max(200).optional(),
  subtitle: z.string().trim().max(300).optional(),
  audience: z.string().trim().min(1).max(300).optional(),
  corePromise: z.string().trim().min(1).max(500).optional(),
  purpose: z.string().trim().max(500).optional(),
  ctaNextStep: z.string().trim().max(300).optional(),
  toneReference: z.string().trim().max(500).optional(),
  problem: z.string().trim().max(500).optional(),
  transformation: z.string().trim().max(500).optional(),
  format: z.string().trim().max(50).optional(),
  lengthTier: z.enum(["quick", "standard", "complete"]).optional(),
  blueprintApproved: z.boolean().optional(),
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

  const update: Record<string, unknown> = {};
  if (parsed.data.productName !== undefined) update.product_name = parsed.data.productName;
  if (parsed.data.subtitle !== undefined) update.subtitle = parsed.data.subtitle;
  if (parsed.data.audience !== undefined) update.audience = parsed.data.audience;
  if (parsed.data.corePromise !== undefined) update.core_promise = parsed.data.corePromise;
  if (parsed.data.purpose !== undefined) update.purpose = parsed.data.purpose;
  if (parsed.data.ctaNextStep !== undefined) update.cta_next_step = parsed.data.ctaNextStep;
  if (parsed.data.toneReference !== undefined) update.tone_reference = parsed.data.toneReference;
  if (parsed.data.problem !== undefined) update.problem = parsed.data.problem;
  if (parsed.data.transformation !== undefined) update.transformation = parsed.data.transformation;
  if (parsed.data.format !== undefined) update.format = parsed.data.format;
  if (parsed.data.lengthTier !== undefined) update.length_tier = parsed.data.lengthTier;
  if (parsed.data.blueprintApproved !== undefined) update.blueprint_approved = parsed.data.blueprintApproved;

  const { data, error } = await supabase
    .from("projects")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return errorResponse(error);
  return NextResponse.json({ project: data });
}
