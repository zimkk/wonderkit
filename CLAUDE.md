# WonderKit — Codebase guide for coding agents

This is an agent-native, multi-tenant AI SaaS starter kit built with Next.js 15 (App Router),
Prisma + PostgreSQL, Inngest, and a provider-agnostic AI layer. The repo is a Turborepo monorepo.
Build it and extend it with the flows below.

## Package map

| Package | Responsibility |
|---|---|
| `apps/web` | The Next.js app: marketing pages, `/app/*` dashboard, `/admin/*`, API route handlers |
| `packages/db` | Prisma schema, DB client singleton, `requireOrgRole`, `PLANS`, typed errors |
| `packages/ai` | LLM provider abstraction, tool framework, cost accounting, rate limiting *(Phase 3)* |
| `packages/agents` | Multi-agent orchestrator, memory, eval harness *(Phase 5)* |
| `packages/ui` | Shared React primitives (`cn`, `Button`, `Card`) and design tokens |

---

## Golden rules — every agent must follow these; CI will grep for violations

1. **All authz via `requireOrgRole` / `resolveApiKey`** (from `@kit/db`). Never write inline role
   checks. Every server action and route handler that touches org data starts with one of these.

2. **All LLM calls via `packages/ai` abstraction**. Never import `@anthropic-ai/sdk`,
   `openai`, or any other vendor SDK in `apps/web` or application code.

3. **All async side effects via Inngest**. Never fire-and-forget `Promise` calls for side effects.
   Background work, emails, usage writes, and agent runs are Inngest functions.

4. **All env access via `@/env`** (the typed t3-env module). Never read `process.env` directly
   in app code. The env module is the single validated boundary.

5. **All external input validated with zod at the boundary** — API route bodies, server action
   form data, tool inputs, webhook payloads.

6. **All plan gating via `gate(orgId, feature)`** reading `PLANS` from `@kit/db`.
   Quotas are data — never hardcode limits in feature code.

7. **Every new AI feature must pass `metadata.feature`** to the AI layer for cost accounting.
   Feature strings are a registered union type in `packages/ai/src/features.ts`.

---

## How to verify your work

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm eval --ci
```

Run this after every change. CI runs the same command.

---

## Where things go

| I need to… | Do this |
|---|---|
| Add a new AI feature | Copy the `/app/chat` pattern; register the feature string in `packages/ai/src/features.ts` |
| Add a new tool | Create in `packages/ai/src/tools/`, register in `packages/ai/src/tools/index.ts` |
| Add a new agent | Create in `packages/agents/src/agents/`, register in the agent registry |
| Add a new email template | Create in `packages/emails/`, add an `EmailLog` write, use `sendEmail()` wrapper |
| Add a new cron job | Create an Inngest function in `apps/web/inngest/`, follow `domain/noun.verb` naming |
| Add a new plan feature flag | Add to `PlanFeatures` interface and `PLANS` in `packages/db/src/plans.ts` |
| Add a new route that requires auth | Start with `requireOrgRole(session, orgId, "MEMBER")` |

---

## What NOT to touch

- **Migration files** (`packages/db/prisma/migrations/`) — never hand-edit; use `prisma migrate dev`.
- **`pricing.ts`** — only update with a new `lastVerified` date when you've confirmed current prices.
- **Webhook signature verification** (`/api/webhooks/stripe`) — the raw-body + signature check is
  a security invariant; don't refactor it out.

---

## Error types

| Class | Status | When to throw |
|---|---|---|
| `AuthzError` | 403 | User lacks required role or is unauthenticated |
| `PlanLimitError` | 402 | Org exceeds quota; pass `upgradeUrl` |
| `RateLimitError` | 429 | Bucket exhausted; pass `retryAfterSec` |
| `ProviderError` | 502 | Upstream LLM call failed after retries |

Route handlers call `toResponse(err)` in the catch block. UI error boundary maps
`PlanLimitError` to the upgrade modal automatically.

---

## Naming conventions (§17)

- Files: `kebab-case`
- DB model fields: `camelCase`
- Inngest events: `domain/noun.verb` (e.g. `billing/payment.failed`)
- Feature strings (cost accounting): `snake_case`, registered union in `features.ts`
- Exported functions: one-line JSDoc stating *when to use it* (agents route on these)
