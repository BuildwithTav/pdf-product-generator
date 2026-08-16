import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, errorResponse } from "@/lib/api-helpers";
import { generateProductIdeas } from "@/lib/prompts";

const IdeasSchema = z.object({
  background: z.string().trim().min(1).max(1000),
  audienceHint: z.string().trim().max(500).optional(),
  interests: z.string().trim().max(500).optional(),
  roughIdea: z.string().trim().max(500).optional(),
  adjustmentNote: z.string().trim().max(500).optional(),
});

export async function POST(request: Request) {
  const { supabase, user, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const body = await request.json();
  const parsed = IdeasSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  let ideas;
  try {
    ideas = await generateProductIdeas(parsed.data);
  } catch (err) {
    return errorResponse(err, "Claude API request failed while generating product ideas.");
  }

  // Seed/refresh the shared business profile so the next product's
  // discovery flow can pre-fill from what we just learned. Best-effort —
  // never let a profile-save hiccup take down idea generation.
  try {
    await supabase.from("business_profiles").upsert(
      {
        id: user.id,
        background: parsed.data.background,
        audience_hint: parsed.data.audienceHint || null,
        interests: parsed.data.interests || null,
      },
      { onConflict: "id" }
    );
  } catch (err) {
    console.error("Failed to save business profile:", err);
  }

  return NextResponse.json({ ideas });
}
