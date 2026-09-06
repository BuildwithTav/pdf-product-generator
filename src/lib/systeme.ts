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
let cachedTagId: number | null = null;

async function resolveTagId(tagName: string): Promise<number> {
  if (cachedTagId !== null) return cachedTagId;

  const listRes = await systemeFetch("/tags");
  if (listRes.ok) {
    const data = await listRes.json();
    const items: Array<{ id: number; name: string }> = data.items ?? data ?? [];
    const existing = items.find((t) => t.name === tagName);
    if (existing) {
      cachedTagId = existing.id;
      return cachedTagId;
    }
  }

  const createRes = await systemeFetch("/tags", {
    method: "POST",
    body: JSON.stringify({ name: tagName }),
  });
  if (!createRes.ok) throw new Error(`Failed to create Systeme.io tag (${createRes.status}).`);
  const created = await createRes.json();
  const id: number = created.id;
  cachedTagId = id;
  return id;
}

// Creates (or finds, if it already exists) a Systeme.io contact for this
// email and applies the given tag. Tagging is the trigger for whatever
// Systeme.io automation sends the actual "how to sell it" breakdown --
// this app only needs to get the contact tagged, not know what happens
// after.
export async function addLeadToSysteme(email: string, tagName: string): Promise<void> {
  const tagId = await resolveTagId(tagName);

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

  const tagRes = await systemeFetch(`/contacts/${contactId}/tags`, {
    method: "POST",
    body: JSON.stringify({ tagId }),
  });
  if (!tagRes.ok && tagRes.status !== 409) {
    throw new Error(`Failed to tag Systeme.io contact (${tagRes.status}).`);
  }
}

export const LEAD_TAG_NAME = process.env.SYSTEME_LEAD_TAG?.trim() || "pdf-generator-lead";
