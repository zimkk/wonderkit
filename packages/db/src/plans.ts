// Plan configuration is DATA, not code (§6). All gating reads from this single object.
// Stripe price IDs are resolved from env at checkout time, not stored here.

import type { Plan } from "@prisma/client";

/** Boolean feature flags gateable per plan. Extend here when adding a gated feature. */
export interface PlanFeatures {
  /** Multi-agent module (Pro tier). */
  agents: boolean;
  /** Org-scoped API keys for programmatic access. */
  apiKeys: boolean;
  /** Priority model tier ("smart") access. */
  smartModels: boolean;
}

export interface PlanConfig {
  /** Display name shown in pricing/billing UI. */
  label: string;
  /** Monthly token quota across all AI features; overage metered on PRO only. */
  includedTokensPerMonth: number;
  /** Max concurrently-defined agents (PRO module). */
  maxAgents: number;
  /** Max org members including owner. */
  maxMembers: number;
  features: PlanFeatures;
}

/** The single source of truth for plan quotas and feature flags. gate() reads this. */
export const PLANS: Record<Plan, PlanConfig> = {
  FREE: {
    label: "Free",
    includedTokensPerMonth: 100_000,
    maxAgents: 0,
    maxMembers: 1,
    features: { agents: false, apiKeys: false, smartModels: false },
  },
  STARTER: {
    label: "Starter",
    includedTokensPerMonth: 2_000_000,
    maxAgents: 0,
    maxMembers: 5,
    features: { agents: false, apiKeys: true, smartModels: true },
  },
  PRO: {
    label: "Pro",
    includedTokensPerMonth: 10_000_000,
    maxAgents: 10,
    maxMembers: 25,
    features: { agents: true, apiKeys: true, smartModels: true },
  },
};
