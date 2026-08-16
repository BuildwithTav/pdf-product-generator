import Anthropic from "@anthropic-ai/sdk";
import { assertHeaderSafeEnv } from "@/lib/env-guard";

let client: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set.");
    }
    assertHeaderSafeEnv("ANTHROPIC_API_KEY", apiKey);
    client = new Anthropic({ apiKey });
  }
  return client;
}

// Model used for all generation calls. Sonnet is the default balance of
// quality/cost for long-form content generation; override via env if needed.
const rawModel = process.env.ANTHROPIC_MODEL?.trim();
if (rawModel) assertHeaderSafeEnv("ANTHROPIC_MODEL", rawModel);
export const CLAUDE_MODEL = rawModel || "claude-sonnet-5";

export { MAX_SECTIONS, MAX_REGENERATIONS_PER_SECTION } from "@/lib/config";
