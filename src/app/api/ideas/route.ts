import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, errorResponse } from "@/lib/api-helpers";
import { generateProductIdeas } from "@/lib/prompts";

const IdeasSchema = z.object({
  background: z.string().trim().min(1).max(1000),
  audienceHint: z.string().trim().max(500).optional(),
  interests: z.string().trim().max(500).optional(),
});

export async function POST(request: Request) {
  const { unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const body = await request.json();
  const parsed = IdeasSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  try {
    const ideas = await generateProductIdeas(parsed.data);
    return NextResponse.json({ ideas });
  } catch (err) {
    return errorResponse(err, "Failed to generate product ideas.");
  }
}
