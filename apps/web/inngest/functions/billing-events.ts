// Billing side-effects as Inngest functions — retryable and observable.
// The Stripe webhook handler only syncs DB state and emits these events.

import { inngest } from "../client";
import { db } from "@kit/db";
import { sendEmail } from "@kit/emails";

export const onPaymentFailed = inngest.createFunction(
  { id: "billing-payment-failed", retries: 3 },
  { event: "billing/payment.failed" },
  async ({ event }) => {
    const { orgId } = event.data as { orgId: string };
    const sub = await db.subscription.findUnique({
      where: { orgId },
      include: { org: { include: { memberships: { include: { user: true }, where: { role: "OWNER" } } } } },
    });
    if (!sub) return;
    const owner = sub.org.memberships[0]?.user;
    if (!owner?.email) return;

    await sendEmail(
      "PaymentFailedEmail",
      { orgName: sub.org.name, updateUrl: `${process.env.AUTH_URL}/app/settings/billing` },
      owner.email,
    );
  },
);

export const onSubscriptionProvisioned = inngest.createFunction(
  { id: "billing-subscription-provisioned", retries: 3 },
  { event: "billing/subscription.provisioned" },
  async ({ event }) => {
    const { orgId } = event.data as { orgId: string };
    const sub = await db.subscription.findUnique({
      where: { orgId },
      include: { org: { include: { memberships: { include: { user: true }, where: { role: "OWNER" } } } } },
    });
    if (!sub) return;
    const owner = sub.org.memberships[0]?.user;
    if (!owner?.email) return;

    await sendEmail(
      "WelcomeEmail",
      { name: owner.name ?? owner.email, plan: sub.plan },
      owner.email,
    );
  },
);
