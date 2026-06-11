# WonderKit Architecture Map (Agent Reference)

> Keep this file accurate — agents use it to navigate without reading all source.

## Request lifecycle

```
Browser/API client
  │
  ▼
Next.js middleware (auth.ts)  ← session check, redirects unauthenticated
  │
  ▼
Route handler / Server action
  ├─ requireOrgRole(session, orgId, role)   ← authz (packages/db/src/authz.ts)
  ├─ gate(orgId, feature)                   ← plan gating (packages/db/src/gate.ts)
  └─ business logic
       ├─ db.*                              ← Prisma (packages/db/src/client.ts)
       ├─ defaultProvider().complete(msgs)  ← AI (packages/ai/src/registry.ts)
       ├─ sendEmail(template, props, to)    ← email (packages/emails/src/send.ts)
       ├─ getUploadUrl(key, type)           ← storage (packages/storage/src/index.ts)
       └─ inngest.send(event)              ← async (apps/web/inngest/client.ts)
```

## Data model (key relationships)

```
User ──── Membership ──── Organization
                │               │
               Role           Subscription (plan, status, stripeCustomerId)
                               │
                          UsageEvent → UsageDailyRollup (nightly cron)
                          AgentRun  → AgentStep
                          MemoryItem (pgvector embedding)
                          ApiKey (hashed)
                          Invitation
                          RateLimitBucket
```

## Key files by concern

| Concern | File |
|---------|------|
| Auth config | `apps/web/src/auth.ts` |
| Env validation | `apps/web/src/env.ts` |
| Active org | `apps/web/src/lib/org.ts` |
| Stripe client | `apps/web/src/lib/stripe.ts` |
| Billing actions | `apps/web/src/lib/billing.ts` |
| Plan definitions | `packages/db/src/plans.ts` |
| Plan gating | `packages/db/src/gate.ts` |
| Authz helpers | `packages/db/src/authz.ts` |
| Typed errors | `packages/db/src/errors.ts` |
| AI providers | `packages/ai/src/providers/` |
| Provider registry | `packages/ai/src/registry.ts` |
| Email templates | `packages/emails/src/` |
| Storage | `packages/storage/src/index.ts` |
| Inngest functions | `apps/web/inngest/functions/` |
| Stripe webhook | `apps/web/src/app/api/webhooks/stripe/route.ts` |
| Chat API | `apps/web/src/app/api/chat/route.ts` |
| Agents runtime | `packages/agents/src/` |

## Plan features registry

Defined in `packages/db/src/plans.ts` as `PLANS: Record<Plan, PlanConfig>`.

Adding a new gated feature:
1. Add key to `PlanFeatures` interface
2. Set `true/false` per plan tier
3. Call `await gate(orgId, "newFeature")` before the operation
