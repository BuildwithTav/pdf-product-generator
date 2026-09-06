import { assertHeaderSafeEnv } from "@/lib/env-guard";

const API_BASE = "https://api.systeme.io/api";

function apiKey(): string {
  const key = process.env.SYSTEME_API_KEY?.trim();
  if (!key) throw new Error("SYSTEME_API_KEY is not set.");
  assertHeaderSafeEnv("SYSTEME_API_KEY", key);
  return key;
}

async function systemeFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey(),
      ...init.headers,
    },
  });
}

// Cached per warm serverless instance only -- a cold start just re-fetches
// once, which is cheap and correct either way.
const tagIdCache = new Map<string, number>();

async function resolveTagId(tagName: string): Promise<number> {
  const cached = tagIdCache.get(tagName);
  if (cached !== undefined) return cached;

  const listRes = await systemeFetch("/tags");
  if (listRes.ok) {
    const data = await listRes.json();
    const items: Array<{ id: number; name: string }> = data.items ?? data ?? [];
    const existing = items.find((t) => t.name === tagName);
    if (existing) {
      tagIdCache.set(tagName, existing.id);
      return existing.id;
    }
  }

  const createRes = await systemeFetch("/tags", {
    method: "POST",
    body: JSON.stringify({ name: tagName }),
  });
  if (!createRes.ok) throw new Error(`Failed to create Systeme.io tag "${tagName}" (${createRes.status}).`);
  const created = await createRes.json();
  const id: number = created.id;
  tagIdCache.set(tagName, id);
  return id;
}

// Creates (or finds, if it already exists) a Systeme.io contact for this
// email and applies every given tag. Tagging is the trigger for whatever
// Systeme.io automation(s) send the actual breakdown/roadmap emails --
// this app only needs to get the contact tagged, not know what happens
// after.
export async function addLeadToSysteme(email: string, tagNames: string[]): Promise<void> {
  let contactId: number | undefined;
  const createRes = await systemeFetch("/contacts", {
    method: "POST",
    body: JSON.stringify({ email }),
  });

  if (createRes.ok) {
    const created = await createRes.json();
    contactId = created.id;
  } else if (createRes.status === 422) {
    const lookupRes = await systemeFetch(`/contacts?email=${encodeURIComponent(email)}`);
    if (!lookupRes.ok) throw new Error(`Failed to look up existing Systeme.io contact (${lookupRes.status}).`);
    const found = await lookupRes.json();
    const items: Array<{ id: number }> = found.items ?? found ?? [];
    contactId = items[0]?.id;
  } else {
    throw new Error(`Failed to create Systeme.io contact (${createRes.status}).`);
  }

  if (!contactId) throw new Error("Could not resolve a Systeme.io contact id.");

  for (const tagName of tagNames) {
    const tagId = await resolveTagId(tagName);
    const tagRes = await systemeFetch(`/contacts/${contactId}/tags`, {
      method: "POST",
      body: JSON.stringify({ tagId }),
    });
    if (!tagRes.ok && tagRes.status !== 409) {
      throw new Error(`Failed to apply tag "${tagName}" to Systeme.io contact (${tagRes.status}).`);
    }
  }
}

export const LEAD_TAG_NAME = process.env.SYSTEME_LEAD_TAG?.trim() || "pdf-generator-lead";
export const ROADMAP_TAG_NAME = process.env.SYSTEME_ROADMAP_TAG?.trim() || "The No BS Roadmap";
export const LEAD_TAG_NAMES = [LEAD_TAG_NAME, ROADMAP_TAG_NAME];
