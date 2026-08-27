import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, errorResponse } from "@/lib/api-helpers";
import { createServiceClient } from "@/lib/supabase/service";

const Schema = z.object({ code: z.string().trim().min(1).max(100) });

// Partner free-access codes are created manually (see 0006_payments.sql's
// comment) and only ever redeemed through this route, which uses the
// service client for the actual write — free_access_codes has no
// client-writable RLS policy, so a client can't just set its own
// remaining_uses via a direct Supabase call.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a code." }, { status: 400 });
  }

  const service = createServiceClient();

  const { data: codeRow, error: codeError } = await service
    .from("free_access_codes")
    .select("code, remaining_uses")
    .eq("code", parsed.data.code)
    .maybeSingle();

  if (codeError) return errorResponse(codeError);
  if (!codeRow || codeRow.remaining_uses <= 0) {
    return NextResponse.json({ error: "That code isn't valid or has no uses left." }, { status: 400 });
  }

  const { error: decrementError } = await service
    .from("free_access_codes")
    .update({ remaining_uses: codeRow.remaining_uses - 1 })
    .eq("code", codeRow.code);

  if (decrementError) return errorResponse(decrementError);

  const { error: paymentError } = await service
    .from("project_payments")
    .update({ paid: true, updated_at: new Date().toISOString() })
    .eq("project_id", id);

  if (paymentError) return errorResponse(paymentError);

  return NextResponse.json({ paid: true });
}
