import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, errorResponse } from "@/lib/api-helpers";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";

const Schema = z.object({ checkoutSessionId: z.string().trim().min(1) });

// Fast-UX companion to the webhook (the real source of truth): checks
// directly with Stripe the moment the browser lands back on the project
// page, so the customer sees their project unlock immediately instead of
// waiting on webhook delivery. Doesn't replace the webhook — a closed tab
// mid-redirect never reaches this route, but the webhook still fires.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  try {
    const session = await stripe().checkout.sessions.retrieve(parsed.data.checkoutSessionId);

    if (session.payment_status !== "paid" || session.client_reference_id !== id) {
      return NextResponse.json({ paid: false });
    }

    const service = createServiceClient();
    const { error } = await service
      .from("project_payments")
      .update({
        paid: true,
        stripe_checkout_session_id: session.id,
        updated_at: new Date().toISOString(),
      })
      .eq("project_id", id);

    if (error) return errorResponse(error);

    return NextResponse.json({ paid: true });
  } catch (err) {
    return errorResponse(err, "Failed to verify payment.");
  }
}
