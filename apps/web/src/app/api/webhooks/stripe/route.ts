// Stripe webhook handler (§6). ONLY syncs DB state and emits Inngest events.
// All side effects (email, provisioning) live in Inngest functions — retryable, observable.

import { NextRequest } from "next/server";
import { db, toResponse } from "@kit/db";
import { requireStripe } from "@/lib/stripe";
import { inngest } from "@/../../inngest/client";
import { env } from "@/env";
import type Stripe from "stripe";

export async function POST(req: NextRequest) {
  try {
    const stripe = requireStripe();
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");
    if (!sig || !env.STRIPE_WEBHOOK_SECRET) {
      return Response.json({ error: "Missing signature" }, { status: 400 });
    }

    const event = stripe.webhooks.constructEvent(body, sig, env.STRIPE_WEBHOOK_SECRET);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.client_reference_id;
        if (!orgId || !session.customer || !session.subscription) break;
        await db.subscription.update({
          where: { orgId },
          data: {
            stripeCustomerId: String(session.customer),
            stripeSubscriptionId: String(session.subscription),
            plan: "STARTER",
            status: "ACTIVE",
          },
        });
        await inngest.send({ name: "billing/subscription.provisioned", data: { orgId } });
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const record = await db.subscription.findUnique({
          where: { stripeSubscriptionId: sub.id },
        });
        if (!record) break;

        const planMap: Record<string, "FREE" | "STARTER" | "PRO"> = {
          [env.STRIPE_STARTER_PRICE_ID ?? ""]: "STARTER",
          [env.STRIPE_PRO_PRICE_ID ?? ""]: "PRO",
        };
        const priceId = sub.items.data[0]?.price.id ?? "";
        const plan = planMap[priceId] ?? "FREE";

        await db.subscription.update({
          where: { id: record.id },
          data: {
            plan: event.type === "customer.subscription.deleted" ? "FREE" : plan,
            status: sub.status === "active" ? "ACTIVE"
              : sub.status === "trialing" ? "TRIALING"
              : sub.status === "past_due" ? "PAST_DUE"
              : sub.status === "canceled" ? "CANCELED"
              : "INCOMPLETE",
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
          },
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const record = await db.subscription.findUnique({
          where: { stripeCustomerId: String(invoice.customer) },
        });
        if (!record) break;
        await db.subscription.update({
          where: { id: record.id },
          data: { status: "PAST_DUE" },
        });
        await inngest.send({ name: "billing/payment.failed", data: { orgId: record.orgId } });
        break;
      }
    }

    return Response.json({ received: true });
  } catch (err) {
    return toResponse(err);
  }
}
