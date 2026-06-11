// Nightly cron: aggregates UsageEvent rows into UsageDailyRollup.
// Idempotent — running twice yields identical rollups (upsert with same key).

import { inngest } from "../client";
import { db } from "@kit/db";

export const usageRollup = inngest.createFunction(
  { id: "usage-rollup-nightly", retries: 3 },
  { cron: "30 0 * * *" }, // 00:30 UTC
  async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const dayEnd = new Date(yesterday);
    dayEnd.setHours(23, 59, 59, 999);

    const events = await db.usageEvent.groupBy({
      by: ["orgId", "feature"],
      where: { createdAt: { gte: yesterday, lte: dayEnd } },
      _sum: { inputTokens: true, outputTokens: true, costUsd: true },
    });

    for (const row of events) {
      const tokens = (row._sum.inputTokens ?? 0) + (row._sum.outputTokens ?? 0);
      await db.usageDailyRollup.upsert({
        where: { orgId_date_feature: { orgId: row.orgId, date: yesterday, feature: row.feature } },
        update: { tokens, costUsd: row._sum.costUsd ?? 0 },
        create: { orgId: row.orgId, date: yesterday, feature: row.feature, tokens, costUsd: row._sum.costUsd ?? 0 },
      });
    }

    // Clean up expired rate-limit buckets
    await db.rateLimitBucket.deleteMany({ where: { expiresAt: { lt: new Date() } } });

    return { rolledUp: events.length };
  },
);
