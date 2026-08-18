import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api-helpers";
import { runResearch, type ResearchStreamEvent } from "@/lib/prompts";

export const maxDuration = 60;

const ResearchSchema = z.object({
  background: z.string().trim().min(1).max(1000),
  audienceHint: z.string().trim().max(500).optional(),
  interests: z.string().trim().max(500).optional(),
  roughIdea: z.string().trim().max(500).optional(),
  openEnded: z.boolean().optional(),
});

export async function POST(request: Request) {
  const { unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const body = await request.json();
  const parsed = ResearchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: ResearchStreamEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };
      try {
        const result = await runResearch(parsed.data, send);
        send({ type: "result", result });
      } catch (err) {
        console.error(err);
        send({ type: "error", message: err instanceof Error ? err.message : "Research failed." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
