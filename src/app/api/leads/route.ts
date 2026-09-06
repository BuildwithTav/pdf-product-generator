import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { addLeadToSysteme, LEAD_TAG_NAMES } from "@/lib/systeme";

const Schema = z.object({
  email: z.string().trim().email(),
  projectId: z.string().uuid().optional(),
  source: z.string().min(1).max(60),
  // Required true, not just optional -- the UI only lets this request fire
  // once the user has checked the consent box themselves, and the server
  // enforces the same rule rather than trusting the client.
  consent: z.literal(true),
});

// Non-blocking lead capture -- never gates anything, and a Systeme.io sync
// failure still leaves the lead saved locally (synced_to_systeme: false)
// rather than losing it, since this is a real external API call that can
// fail for reasons unrelated to the user's input.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email and confirm consent." }, { status: 400 });
  }
  const { email, projectId, source } = parsed.data;

  let synced = false;
  try {
    await addLeadToSysteme(email, LEAD_TAG_NAMES);
    synced = true;
  } catch (err) {
    console.error("Failed to sync lead to Systeme.io:", err);
  }

  const service = createServiceClient();
  const { error } = await service.from("leads").insert({
    email,
    project_id: projectId ?? null,
    source,
    synced_to_systeme: synced,
    consented: true,
  });
  if (error) console.error("Failed to store lead:", error);

  return NextResponse.json({ ok: true });
}
