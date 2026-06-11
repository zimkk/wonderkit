// Fires when usage hits 80%+ of the monthly quota.
// Sends a UsageAlertEmail to the org owner with an upgrade link.

import { inngest } from "../client";
import { db } from "@kit/db";
import { sendEmail } from "@kit/emails";

export const onUsageAlert = inngest.createFunction(
  { id: "usage-quota-alert", retries: 3 },
  { event: "usage/quota.alert" },
  async ({ event }) => {
    const { orgId, usedPct } = event.data as { orgId: string; usedPct: number };

    const sub = await db.subscription.findUnique({
      where: { orgId },
      include: {
        org: {
          include: {
            memberships: {
              where: { role: "OWNER" },
              include: { user: true },
            },
          },
        },
      },
    });

    if (!sub) return;
    const owner = sub.org.memberships[0]?.user;
    if (!owner?.email) return;

    const upgradeUrl = `${process.env.AUTH_URL ?? "http://localhost:3000"}/app/settings/billing`;

    await sendEmail(
      "UsageAlertEmail",
      { orgName: sub.org.name, usedPct, upgradeUrl },
      owner.email,
    );
  },
);
