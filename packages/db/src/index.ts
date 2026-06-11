// Public surface of @kit/db. App code imports ONLY from here (ESLint boundary rule).

export { db } from "./client";
export { requireOrgRole, resolveApiKey, hashApiKey } from "./authz";
export type { OrgContext, SessionLike } from "./authz";
export { PLANS } from "./plans";
export type { PlanConfig, PlanFeatures } from "./plans";
export {
  KitError,
  AuthzError,
  PlanLimitError,
  RateLimitError,
  ProviderError,
  toResponse,
} from "./errors";
export { gate, assertTokenBudget } from "./gate";
export type {
  User,
  Organization,
  Membership,
  Role,
  Plan,
  Subscription,
  UsageEvent,
  UsageDailyRollup,
  AgentRun,
  AgentStep,
  RunStatus,
  StepType,
  ApiKey,
  Invitation,
} from "@prisma/client";
