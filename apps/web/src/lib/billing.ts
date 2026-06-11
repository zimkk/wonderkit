"use server";

import { requireOrgRole } from "@kit/db";
import { auth } from "@/auth";
import { requireStripe, stripePriceId } from "./stripe";
import { env } from "@/env";

/** Create a Stripe Checkout session for plan upgrade. */
export async function createCheckoutSession(orgId: string, plan: "STARTER" | "PRO"): Promise<string> {
  const session = await auth();
  await requireOrgRole(session, orgId, "OWNER");
  const stripe = requireStripe();
  const priceId = stripePriceId(plan);
  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { orgId, plan },
    success_url: `${env.AUTH_URL}/app/settings/billing?upgraded=1`,
    cancel_url: `${env.AUTH_URL}/app/settings/billing`,
    allow_promotion_codes: true,
  });
  if (!checkoutSession.url) throw new Error("No Stripe session URL");
  return checkoutSession.url;
}

/** Create a Stripe Customer Portal session for managing the subscription. */
export async function createPortalSession(orgId: string, customerId: string): Promise<string> {
  const session = await auth();
  await requireOrgRole(session, orgId, "OWNER");
  const stripe = requireStripe();
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${env.AUTH_URL}/app/settings/billing`,
  });
  return portalSession.url;
}
