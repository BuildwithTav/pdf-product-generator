import Stripe from "stripe";
import { assertHeaderSafeEnv } from "@/lib/env-guard";

let client: Stripe | null = null;

export function stripe(): Stripe {
  if (!client) {
    const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
    if (!secretKey) {
      throw new Error("STRIPE_SECRET_KEY is not set.");
    }
    assertHeaderSafeEnv("STRIPE_SECRET_KEY", secretKey);
    client = new Stripe(secretKey);
  }
  return client;
}

// Flat price for every project, per product decision (no bundles/subscriptions).
export const PROJECT_PRICE_USD_CENTS = 1000;
