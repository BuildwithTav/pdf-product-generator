import type { ResearchResult, ResearchStreamEvent, TrendingTopic, TrendScanStreamEvent } from "@/lib/prompts";

export interface ResearchPayload {
  background: string;
  audienceHint?: string;
  interests?: string;
  roughIdea?: string;
  openEnded?: boolean;
  openEndedTopic?: string;
}

// Shared by streamResearch and streamTrendingTopics — both endpoints stream
// NDJSON events shaped { type: "status"|"result"|"error" }, just with a
// different payload under "result".
async function readNdjsonStream<TEvent extends { type: string }, TResult>(
  url: string,
  payload: unknown,
  onStatus: (message: string) => void,
  extractResult: (event: TEvent) => TResult | undefined
): Promise<TResult | undefined> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Request failed.");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: TResult | undefined;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line) as TEvent & { message?: string };
      if (event.type === "status" && typeof event.message === "string") onStatus(event.message);
      else if (event.type === "result") result = extractResult(event);
      else if (event.type === "error") throw new Error(event.message ?? "Request failed.");
    }
  }

  return result;
}

export async function streamResearch(
  payload: ResearchPayload,
  onStatus: (message: string) => void
): Promise<ResearchResult | undefined> {
  return readNdjsonStream<ResearchStreamEvent, ResearchResult>(
    "/api/research",
    payload,
    onStatus,
    (event) => (event.type === "result" ? event.result : undefined)
  );
}

export async function streamTrendingTopics(
  onStatus: (message: string) => void
): Promise<TrendingTopic[] | undefined> {
  return readNdjsonStream<TrendScanStreamEvent, TrendingTopic[]>(
    "/api/trending-topics",
    {},
    onStatus,
    (event) => (event.type === "result" ? event.result : undefined)
  );
}
