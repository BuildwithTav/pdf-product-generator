import type { ResearchResult, ResearchStreamEvent } from "@/lib/prompts";

export interface ResearchPayload {
  background: string;
  audienceHint?: string;
  interests?: string;
  roughIdea?: string;
}

export async function streamResearch(
  payload: ResearchPayload,
  onStatus: (message: string) => void
): Promise<ResearchResult | undefined> {
  const res = await fetch("/api/research", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Research request failed.");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: ResearchResult | undefined;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line) as ResearchStreamEvent;
      if (event.type === "status") onStatus(event.message);
      else if (event.type === "result") result = event.result;
      else if (event.type === "error") throw new Error(event.message);
    }
  }

  return result;
}
