import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

// Model used for all generation calls. Sonnet is the default balance of
// quality/cost for long-form content generation; override via env if needed.
export const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

export { MAX_SECTIONS, MAX_REGENERATIONS_PER_SECTION } from "@/lib/config";
