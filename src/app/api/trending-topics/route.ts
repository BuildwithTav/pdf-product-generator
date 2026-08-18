import { requireUser } from "@/lib/api-helpers";
import { runTrendScan, type TrendingTopic, type TrendScanStreamEvent } from "@/lib/prompts";

export const maxDuration = 300;

const CACHE_ID = "latest";
const CACHE_TTL_MS = 60 * 60 * 1000;
const SHOWN_COUNT = 5;

// The cache stores the full scanned pool (up to 8 topics); each request
// gets a random 5 of them. Without this, everyone hitting the cache during
// the same window would see the exact same 5 topics in the exact same
// order, making it far more likely different people pick the same one and
// end up building near-identical products.
function pickRandomSubset<T>(pool: T[], count: number): T[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export async function POST() {
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: TrendScanStreamEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };
      try {
        // Trending topics are shared, non-personalized data ("what's
        // trending this week"), so a fresh-enough scan from any user can
        // be reused for everyone instead of paying for a new Claude call
        // every time — this is the main cost lever, since most repeated
        // scans happen in quick succession (retries, multiple users
        // checking the same day).
        const { data: cached } = await supabase
          .from("trend_scan_cache")
          .select("topics, created_at")
          .eq("id", CACHE_ID)
          .maybeSingle();

        const cachedTopics = cached?.topics as TrendingTopic[] | undefined;
        const cacheAge = cached?.created_at ? Date.now() - new Date(cached.created_at).getTime() : Infinity;

        if (cacheAge < CACHE_TTL_MS && Array.isArray(cachedTopics) && cachedTopics.length > 0) {
          send({ type: "status", message: "Using this week's already-scanned trending topics..." });
          send({ type: "result", result: pickRandomSubset(cachedTopics, SHOWN_COUNT) });
        } else {
          const pool = await runTrendScan(send);
          send({ type: "result", result: pickRandomSubset(pool, SHOWN_COUNT) });

          // Best-effort cache refresh — never let a write hiccup fail the
          // request that already has a good result in hand. Cache the full
          // pool, not just the subset shown to this particular request.
          try {
            await supabase
              .from("trend_scan_cache")
              .upsert({ id: CACHE_ID, topics: pool, created_at: new Date().toISOString() });
          } catch (cacheErr) {
            console.error("Failed to refresh trend scan cache:", cacheErr);
          }
        }
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
