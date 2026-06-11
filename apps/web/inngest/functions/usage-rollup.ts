// Nightly cron: aggregates UsageEvent rows into UsageDailyRollup.
// Also fires usage alerts at 80% quota and reports metered usage to Stripe.
// Idempotent — running twice yields identical rollups (upsert with same key).

import { inngest } from "../client";
import { db, PLANS } from "@kit/db";

export const usageRollup = inngest.createFunction(
  { id: "usage-rollup-nightly", retries: 3 },
  { cron: "30 0 * * *" }, // 00:30 UTC
  async ({ step }) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const dayEnd = new Date(yesterday);
    dayEnd.setHours(23, 59, 59, 999);

    // Step 1: aggregate and upsert daily rollups
    const events = await step.run("aggregate-usage", async () => {
      return db.usageEvent.groupBy({
        by: ["orgId", "feature"],
        where: { createdAt: { gte: yesterday, lte: dayEnd } },
        _sum: { inputTokens: true, outputTokens: true, costUsd: true },
      });
    });

    for (const row of events) {
      const tokens = (row._sum.inputTokens ?? 0) + (row._sum.outputTokens ?? 0);
      await step.run(`upsert-rollup-${row.orgId}-${row.feature}`, async () => {
        return db.usageDailyRollup.upsert({
          where: { orgId_date_feature: { orgId: row.orgId, date: yesterday, feature: row.feature } },
          update: { tokens, costUsd: row._sum.costUsd ?? 0 },
          create: { orgId: row.orgId, date: yesterday, feature: row.feature, tokens, costUsd: row._sum.costUsd ?? 0 },
        });
      });
    }

    // Step 2: check quota usage per org, emit alerts and report Stripe metered usage
    const orgs = [...new Set(events.map((e) => e.orgId))];

    for (const orgId of orgs) {
      await step.run(`check-quota-${orgId}`, async () => {
        const sub = await db.subscription.findUnique({ where: { orgId } });
        const plan = sub?.plan ?? "FREE";
        const quota = PLANS[plan].includedTokensPerMonth;

        // Sum all tokens this calendar month so far
        const monthStart = new Date(yesterday.getFullYear(), yesterday.getMonth(), 1);
        const monthRollups = await db.usageDailyRollup.aggregate({
          where: { orgId, date: { gte: monthStart, lte: yesterday } },
          _sum: { tokens: true },
        });
        const usedTokens = monthRollups._sum.tokens ?? 0;
        const usedPct = Math.round((usedTokens / quota) * 100);

        // Emit usage alert at 80%+
        if (usedPct >= 80) {
          await inngest.send({
            name: "usage/quota.alert",
            data: { orgId, usedPct, usedTokens, quota, plan },
          });
        }

        // Report metered overage to Stripe for PRO plans
        if (plan === "PRO" && sub?.stripeSubscriptionId && process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRO_METERED_PRICE_ID) {
          const overageTokens = Math.max(0, usedTokens - quota);
          if (overageTokens > 0) {
            const { default: Stripe } = await import("stripe");
            const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-02-24.acacia" });
            const items = await stripe.subscriptionItems.list({ subscription: sub.stripeSubscriptionId });
            const meteredItem = items.data.find((i) => i.price.id === process.env.STRIPE_PRO_METERED_PRICE_ID);
            if (meteredItem) {
              await stripe.subscriptionItems.createUsageRecord(meteredItem.id, {
                quantity: overageTokens,
                timestamp: Math.floor(yesterday.getTime() / 1000),
                action: "set",
              });
            }
          }
        }
      });
    }

    // Step 3: clean up expired rate-limit buckets
    await step.run("cleanup-rate-limits", async () => {
      return db.rateLimitBucket.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    });

    return { rolledUp: events.length, orgsChecked: orgs.length };
  },
);
