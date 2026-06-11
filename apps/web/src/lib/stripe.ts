// Stripe client singleton (§6). Never import stripe directly in app code.

import Stripe from "stripe";
import { env, services } from "@/env";

/** Stripe client. Null when STRIPE_SECRET_KEY is not set (dev without Stripe). */
export const stripe: Stripe | null = services.stripe
  ? new Stripe(env.STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24.acacia" })
  : null;

/** Throws a clear error if Stripe is not configured — use in billing-only routes. */
export function requireStripe(): Stripe {
  if (!stripe) throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY in .env");
  return stripe;
}

/** Plan → Stripe price ID map, resolved from env. */
export function stripePriceId(plan: "STARTER" | "PRO"): string {
  const ids = {
    STARTER: env.STRIPE_STARTER_PRICE_ID,
    PRO: env.STRIPE_PRO_PRICE_ID,
  };
  const id = ids[plan];
  if (!id) throw new Error(`Stripe price ID for ${plan} not configured`);
  return id;
}
