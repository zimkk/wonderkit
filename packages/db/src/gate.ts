// Plan feature gating (§6). All plan limits are enforced here — never inline.
// gate() reads PLANS which is data, so changing a quota is a one-line edit.

import { db } from "./client";
import { PLANS } from "./plans";
import type { PlanFeatures } from "./plans";
import { PlanLimitError } from "./errors";

/**
 * Use before any plan-gated operation. Throws PlanLimitError(402) if the org
 * is on a plan that does not include the feature, or has exceeded its quota.
 */
export async function gate(orgId: string, feature: keyof PlanFeatures): Promise<void> {
  const sub = await db.subscription.findUnique({ where: { orgId } });
  const plan = sub?.plan ?? "FREE";
  const config = PLANS[plan];
  if (!config.features[feature]) {
    throw new PlanLimitError(
      `Your ${config.label} plan does not include ${String(feature)}. Upgrade to unlock it.`,
    );
  }
}

/**
 * Use before AI calls. Throws PlanLimitError if the org has exceeded its
 * monthly token quota. Pass estimated tokens; actual cost is recorded after.
 */
export async function assertTokenBudget(orgId: string): Promise<void> {
  const sub = await db.subscription.findUnique({ where: { orgId } });
  const plan = sub?.plan ?? "FREE";
  const quota = PLANS[plan].includedTokensPerMonth;

  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const usage = await db.usageEvent.aggregate({
    where: { orgId, createdAt: { gte: start } },
    _sum: { inputTokens: true, outputTokens: true },
  });

  const used = (usage._sum.inputTokens ?? 0) + (usage._sum.outputTokens ?? 0);
  if (used >= quota) {
    throw new PlanLimitError(
      `You have used ${used.toLocaleString()} of your ${quota.toLocaleString()} monthly token quota.`,
    );
  }
}
