import { requireUser } from "@/lib/api-helpers";
import { runTrendScan, type TrendScanStreamEvent } from "@/lib/prompts";

export const maxDuration = 60;

export async function POST() {
  const { unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: TrendScanStreamEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };
      try {
        const result = await runTrendScan(send);
        send({ type: "result", result });
      } catch (err) {
        console.error(err);
        send({ type: "error", message: err instanceof Error ? err.message : "Trend scan failed." });
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
