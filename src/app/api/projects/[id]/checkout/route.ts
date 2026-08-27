import { NextResponse } from "next/server";
import { requireUser, errorResponse } from "@/lib/api-helpers";
import { stripe, PROJECT_PRICE_USD_CENTS } from "@/lib/stripe";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { data: project, error } = await supabase
    .from("projects")
    .select("id, product_name")
    .eq("id", id)
    .single();

  if (error || !project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const origin = new URL(request.url).origin;

  try {
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      client_reference_id: project.id,
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: PROJECT_PRICE_USD_CENTS,
            product_data: {
              name: `PDF product: ${project.product_name}`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/project/${project.id}?checkout_session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/project/${project.id}`,
    });

    if (!session.url) throw new Error("Stripe did not return a checkout URL.");
    return NextResponse.json({ url: session.url });
  } catch (err) {
    return errorResponse(err, "Failed to start checkout.");
  }
}
