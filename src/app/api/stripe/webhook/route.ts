import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";
import { assertHeaderSafeEnv } from "@/lib/env-guard";

// Called by Stripe, not the browser — no user session/cookies here. This
// is the authoritative "did they actually pay" signal (the verify-on-
// return route in [id]/verify-payment is a fast-UX path for the same
// browser tab, but a customer closing the tab before the redirect
// completes would never reach it — this webhook fires independently of
// what the browser does).
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET is not set." }, { status: 500 });
  }
  assertHeaderSafeEnv("STRIPE_WEBHOOK_SECRET", secret);

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  // Must be the raw, unparsed body — Stripe's signature is computed over
  // these exact bytes, so calling request.json() first would break it.
  const rawBody = await request.text();

  let event;
  try {
    event = stripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const projectId = session.client_reference_id;

    if (projectId) {
      const service = createServiceClient();
      // Idempotent: safe to receive this event more than once (Stripe
      // retries on a non-2xx response, and can also just send it twice).
      const { error } = await service
        .from("project_payments")
        .update({
          paid: true,
          stripe_checkout_session_id: session.id,
          updated_at: new Date().toISOString(),
        })
        .eq("project_id", projectId);

      if (error) {
        console.error("Failed to record payment for project", projectId, error);
        return NextResponse.json({ error: "Failed to record payment." }, { status: 500 });
      }
    } else {
      console.error("Stripe checkout.session.completed with no client_reference_id", session.id);
    }
  }

  return NextResponse.json({ received: true });
}
