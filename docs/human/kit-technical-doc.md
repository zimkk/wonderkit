# Agent-Native AI SaaS Kit — Complete Technical Build Document
**Owner:** Hassan Nazir (Gridcore) · **Version:** 1.0 · **Date:** June 10, 2026
**Companion doc:** agent-native-kit-spec.md (product spec & business plan)

This document is the engineering source of truth for building the kit. It is written to be consumed by both Hassan and coding agents (Claude Code / Cursor). Every section ends with acceptance criteria. Build order is defined in §18.

---

## 1. Product engineering goals

1. **Agent-drivable:** a fresh Claude Code session, given only the repo, must complete all 18 verified prompts without human rescue.
2. **Production-credible:** every pattern must be one Hassan would ship to a paying Gridcore client.
3. **Swap-friendly:** LLM providers, deploy targets, and email/storage vendors are replaceable behind interfaces.
4. **Observable by default:** every AI call and agent run is metered, logged, and visible in the admin panel.
5. **Clean-room:** zero OpenClaw source code. Patterns re-implemented from first principles. Keep `docs/human/PROVENANCE.md` stating this.

Non-goals (v1): mobile apps, multi-region, SSO/SAML, i18n, white-labeling.

---

## 2. Architecture overview

**Shape:** Turborepo monorepo, single deployable Next.js app + shared packages. One Postgres database (with pgvector). Inngest as the only async substrate (jobs, crons, agent runs). No Redis in v1 (rate limiting via Postgres; revisit if needed).

```
┌─────────────────────────────────────────────────────┐
│  apps/web (Next.js 15, App Router)                  │
│  ├── marketing pages (public)                       │
│  ├── app/* (authed dashboard)                       │
│  ├── admin/* (internal)                             │
│  └── api/* (route handlers: webhooks, ai, inngest)  │
└──────┬──────────────┬──────────────┬────────────────┘
       │              │              │
  packages/db    packages/ai    packages/agents (Pro)
  (Prisma)       (providers,    (orchestrator, memory,
       │          tools, cost)   runs, evals)
       │              │              │
       └──────── PostgreSQL + pgvector ────────────────
                      │
                 Inngest (jobs, crons, agent steps)
                      │
        Stripe · Resend · R2 · LLM providers
```

**Request flows to internalize:**
- *AI feature call:* route handler → `packages/ai` provider abstraction → streamed to client → usage event written to `UsageEvent` (fire-and-forget via Inngest) → aggregated nightly.
- *Agent run (Pro):* API creates `AgentRun` → Inngest function executes steps (each step = one Inngest step for durability) → step records written → timeline UI polls/streams.
- *Stripe webhook:* `/api/webhooks/stripe` verifies signature → upserts subscription state → emits Inngest event for side effects (email, provisioning).

---

## 3. Stack & tooling (pinned decisions)

| Concern | Choice | Notes |
|---|---|---|
| Framework | Next.js 15.x, App Router, RSC | Node runtime for AI routes (streaming), not edge, to keep provider SDK compatibility |
| Language | TypeScript 5.x, `strict: true` | `noUncheckedIndexedAccess: true` |
| Monorepo | Turborepo + pnpm workspaces | `apps/web`, `packages/*` |
| DB | PostgreSQL 16 + pgvector | Neon (Vercel path) / Docker (VPS path) |
| ORM | Prisma 6.x | One schema in `packages/db` |
| Auth | Auth.js v5 | Prisma adapter; magic link (Resend) + Google + GitHub |
| Payments | Stripe | Subscriptions + usage-based (metered) billing |
| Jobs | Inngest | Also hosts agent run execution; self-host path uses Inngest dev server or OSS gateway |
| Email | Resend + React Email | Templates in `packages/emails` |
| Storage | Cloudflare R2 | S3-compatible client; presigned URLs only, no proxying bytes |
| UI | Tailwind CSS + shadcn/ui | Design tokens in `packages/ui` |
| Validation | zod | All external inputs (API, tools, env) validated |
| Testing | Vitest + Playwright | Plus eval harness in `evals/` |
| Lint/format | ESLint flat config + Prettier | CI-enforced |
| Env | t3-env pattern (`@t3-oss/env-nextjs`) | Typed, validated env access — agents must never read `process.env` directly |

**Versions policy:** pin minor versions in package.json at release; a `RENOVATE.md` note documents the quarterly upgrade ritual (it's part of the update cadence).

---

## 4. Database schema (Prisma)

Authoritative schema lives at `packages/db/prisma/schema.prisma`. Models below are the v1 contract; field-level comments are mandatory (agents read them).

```prisma
// ---------- Identity & Orgs ----------
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String?
  image         String?
  emailVerified DateTime?
  createdAt     DateTime @default(now())
  memberships   Membership[]
  accounts      Account[]   // Auth.js
  sessions      Session[]   // Auth.js
  isSuperAdmin  Boolean  @default(false) // kit-owner internal admin
}

model Organization {
  id            String   @id @default(cuid())
  name          String
  slug          String   @unique
  createdAt     DateTime @default(now())
  memberships   Membership[]
  subscription  Subscription?
  usageEvents   UsageEvent[]
  agentRuns     AgentRun[]
  apiKeys       ApiKey[]
}

model Membership {
  id        String   @id @default(cuid())
  userId    String
  orgId     String
  role      Role     @default(MEMBER) // OWNER | ADMIN | MEMBER
  user      User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  org       Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  @@unique([userId, orgId])
}

enum Role { OWNER ADMIN MEMBER }

model ApiKey {
  id         String   @id @default(cuid())
  orgId      String
  name       String
  hashedKey  String   @unique // store SHA-256 only; show plaintext once
  lastUsedAt DateTime?
  createdAt  DateTime @default(now())
  revokedAt  DateTime?
  org        Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
}

// ---------- Billing ----------
model Subscription {
  id                   String   @id @default(cuid())
  orgId                String   @unique
  stripeCustomerId     String   @unique
  stripeSubscriptionId String?  @unique
  plan                 Plan     @default(FREE) // FREE | STARTER | PRO
  status               SubStatus @default(ACTIVE) // mirrors Stripe status enum subset
  currentPeriodEnd     DateTime?
  cancelAtPeriodEnd    Boolean  @default(false)
  org                  Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
}

enum Plan { FREE STARTER PRO }
enum SubStatus { ACTIVE TRIALING PAST_DUE CANCELED INCOMPLETE }

// ---------- AI usage & cost ----------
model UsageEvent {
  id          String   @id @default(cuid())
  orgId       String
  userId      String?
  feature     String   // e.g. "chat", "summarizer", "agent_run"
  provider    String   // "anthropic" | "openai" | ...
  model       String
  inputTokens  Int
  outputTokens Int
  costUsd     Decimal  @db.Decimal(12, 6) // computed at write time from pricing table
  metadata    Json?
  createdAt   DateTime @default(now())
  org         Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  @@index([orgId, createdAt])
  @@index([orgId, feature, createdAt])
}

model UsageDailyRollup { // nightly cron aggregates; admin charts & Stripe metering read this
  id        String   @id @default(cuid())
  orgId     String
  date      DateTime @db.Date
  feature   String
  tokens    Int
  costUsd   Decimal  @db.Decimal(12, 6)
  @@unique([orgId, date, feature])
}

// ---------- Multi-agent (Pro) ----------
model AgentRun {
  id          String    @id @default(cuid())
  orgId       String
  userId      String?
  agent       String    // agent slug from registry, e.g. "orchestrator"
  status      RunStatus @default(QUEUED) // QUEUED RUNNING NEEDS_APPROVAL SUCCEEDED FAILED CANCELED
  input       Json
  output      Json?
  error       String?
  costUsd     Decimal   @db.Decimal(12, 6) @default(0)
  startedAt   DateTime?
  finishedAt  DateTime?
  createdAt   DateTime  @default(now())
  steps       AgentStep[]
  org         Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  @@index([orgId, createdAt])
}

enum RunStatus { QUEUED RUNNING NEEDS_APPROVAL SUCCEEDED FAILED CANCELED }

model AgentStep {
  id        String   @id @default(cuid())
  runId     String
  index     Int
  type      StepType // LLM_CALL | TOOL_CALL | SUBAGENT | APPROVAL | NOTE
  name      String   // tool name / sub-agent slug / model
  input     Json?
  output    Json?
  tokens    Int      @default(0)
  costUsd   Decimal  @db.Decimal(12, 6) @default(0)
  durationMs Int?
  createdAt DateTime @default(now())
  run       AgentRun @relation(fields: [runId], references: [id], onDelete: Cascade)
  @@unique([runId, index])
}

enum StepType { LLM_CALL TOOL_CALL SUBAGENT APPROVAL NOTE }

model MemoryItem { // semantic memory (pgvector)
  id        String   @id @default(cuid())
  orgId     String
  agent     String?
  kind      String   // "fact" | "preference" | "doc_chunk" | custom
  content   String
  embedding Unsupported("vector(1536)")?
  metadata  Json?
  createdAt DateTime @default(now())
  @@index([orgId, kind])
}

// ---------- Rate limiting (Postgres-based, v1) ----------
model RateLimitBucket {
  key       String   @id // e.g. "org:abc:chat:minute:2026-06-10T16:54"
  count     Int      @default(0)
  expiresAt DateTime
  @@index([expiresAt])
}
```

Plus standard Auth.js models (`Account`, `Session`, `VerificationToken`) from the Prisma adapter docs, unmodified.

**Migration policy:** `prisma migrate dev` locally; deploy runs `prisma migrate deploy`. Never `db push` outside prototyping. Seed script creates: demo org, owner user, FREE subscription, sample usage events, one sample agent run with steps (so dashboards are never empty on first boot — important for the demo video).

**Acceptance (schema):** `pnpm db:migrate && pnpm db:seed` on a fresh Postgres yields a working login + populated dashboard.

---

## 5. Authentication & authorization

**Auth.js v5** in `apps/web/auth.ts`, Prisma adapter, session strategy `database`.

Providers: (1) Resend magic link, (2) Google OAuth, (3) GitHub OAuth. All three behind typed env validation; the app must boot with any subset configured (feature-detect, hide buttons for missing providers) — buyers won't have all keys on day one.

**Org model rules:**
- First login auto-creates a personal Organization (slug from email local-part + nanoid suffix) and an OWNER membership.
- Session callback injects `activeOrgId` (cookie-selected, validated against memberships) and `role`.
- Org switcher in the dashboard shell; invitations via email (Inngest job → Resend) with signed token, 7-day expiry.

**Authorization pattern (the one agents must copy):**
```ts
// packages/db/src/authz.ts
export async function requireOrgRole(
  session: Session, orgId: string, min: Role
): Promise<Membership> { /* throws AuthzError(403) */ }
```
Every server action / route handler starts with `requireOrgRole`. No inline role checks. Document this invariant in `docs/agent/architecture-map.md` — it is one of the things the verification loop greps for.

**API keys:** org-scoped bearer keys for programmatic access (`Authorization: Bearer sk_live_...`). Plaintext shown once; SHA-256 stored. Middleware `resolveApiKey()` maps key → org context with same authz object shape as sessions, so downstream code is identical for both auth modes.

**Acceptance (auth):** magic link + one OAuth provider work; invited member sees org; MEMBER hitting an ADMIN-only action gets 403 via `requireOrgRole`; API key can call one protected endpoint.

---

## 6. Billing (Stripe)

**Products & prices (created by `scripts/stripe-bootstrap.ts`, idempotent):**
- `starter_monthly` — flat subscription.
- `pro_monthly` — flat subscription + attached **metered price** `ai_tokens` (unit = 1K tokens) for overage beyond included quota.
- Plan config is data, not code: `packages/db/src/plans.ts` exports `PLANS` with quotas (`includedTokensPerMonth`, `maxAgents`, `maxMembers`, feature flags). All gating reads from this single object.

**Flows:**
1. *Checkout:* server action creates Stripe Checkout Session (mode=subscription) with `client_reference_id = orgId`; success URL returns to `/app/settings/billing?status=success`.
2. *Portal:* customer portal session for plan changes/cancel — never build custom cancel UI.
3. *Webhooks* (`/api/webhooks/stripe`, raw body, signature verified):
   - `checkout.session.completed` → upsert Subscription, set plan
   - `customer.subscription.updated|deleted` → sync status/plan/periodEnd/cancelAtPeriodEnd
   - `invoice.payment_failed` → status PAST_DUE + Inngest event `billing/payment.failed` (email)
   Handler is a switch that ONLY syncs DB state and emits Inngest events; side effects live in Inngest functions (retryable, observable).
4. *Metered usage push:* nightly Inngest cron reads `UsageDailyRollup`, pushes overage to Stripe via usage records API for PRO orgs. Idempotency key = `orgId:date`.

**Feature gating helper (the pattern agents copy):**
```ts
// packages/db/src/gate.ts
export async function gate(orgId: string, feature: keyof PlanFeatures): Promise<void>
// throws PlanLimitError(402, upgradeUrl) — UI catches and renders upgrade modal
```

**Acceptance (billing):** test-mode card upgrades org FREE→STARTER and webhook flips plan within 5s; cancel via portal downgrades at period end; simulated `payment_failed` sends the dunning email; metered overage appears on a Stripe test invoice.

---

## 7. Background jobs (Inngest)

All async work is Inngest functions in `apps/web/inngest/`. Conventions:
- Event names: `domain/noun.verb` (`billing/payment.failed`, `agent/run.requested`, `usage/rollup.nightly`).
- Every function declares `retries` explicitly; default 3 with backoff.
- Long agent runs use `step.run()` per agent step → durability + resumability for free.
- Crons v1: `usage/rollup.nightly` (00:30 UTC), `billing/usage-push.nightly` (01:00 UTC), `memory/prune.weekly`.

**Self-host note:** Vercel path uses Inngest Cloud free tier; VPS path runs `inngest dev`-equivalent via the official Docker image, documented in `deploy/vps/`. The abstraction cost is zero because the SDK is identical.

**Acceptance (jobs):** killing the process mid-agent-run and restarting resumes from the last completed step; nightly rollup is idempotent (running twice yields identical rollups).

---

## 8. Email (Resend + React Email)

`packages/emails` exports typed templates: `WelcomeEmail`, `MagicLinkEmail`, `InviteEmail`, `PaymentFailedEmail`, `UsageAlertEmail` (80% of quota). One `sendEmail(template, props, to)` wrapper adds: from-address config, dev-mode console transport (no Resend key needed to develop — log the rendered HTML path instead), and an `EmailLog` row for the admin panel. Usage alert triggers from the nightly rollup cron when month-to-date tokens cross 80%/100% of plan quota (one alert per threshold per month — dedupe via `EmailLog`).

**Acceptance (email):** all five templates render in React Email preview; dev mode works keyless; usage alert fires exactly once per threshold.

---

## 9. Storage (R2)

`packages/storage` wraps the S3 client: `getUploadUrl(orgId, filename, contentType, maxBytes)` and `getDownloadUrl(key)` — presigned only, 15-minute expiry, keys namespaced `org/{orgId}/...`. Client uploads direct-to-R2 (never through the app). zod-validated content types; an `Attachment` table (add to schema in this phase) records ownership for authz on download. Dev mode: MinIO via docker-compose so buyers develop without a Cloudflare account.

**Acceptance (storage):** chat attachment uploads from browser direct to R2/MinIO; cross-org download attempt 403s.

---

## 10. AI layer (`packages/ai`)

### 10.1 Provider abstraction
```ts
export interface LlmProvider {
  id: "anthropic" | "openai" | "openrouter" | "ollama";
  complete(req: CompletionRequest): Promise<CompletionResult>;
  stream(req: CompletionRequest): AsyncIterable<StreamChunk>; // text + tool_use chunks
  countTokensEstimate(text: string): number;
}
export interface CompletionRequest {
  model: string;
  system?: string;
  messages: ChatMessage[];          // normalized internal format
  tools?: ToolDefinition[];          // normalized; adapters map per provider
  maxTokens: number;
  temperature?: number;
  metadata: { orgId: string; userId?: string; feature: string }; // REQUIRED — cost accounting
}
```
- Adapters: `anthropic.ts`, `openai.ts`, `openrouter.ts`, `ollama.ts`. Each maps the normalized format ↔ vendor SDK, including tool-calling shape differences. OpenRouter adapter doubles as the "bring any model" escape hatch.
- `getModel(tier: "fast" | "smart" | "cheap")` resolves model IDs from env-configured map — features request a *tier*, never a hardcoded model string. This single convention enables verified prompt #9 (swap models per plan) to be a config diff.
- **Pricing table:** `packages/ai/src/pricing.ts` — per-model $/MTok input/output, versioned, with `lastVerified` date. Cost computed at usage-write time. A unit test fails if any configured model lacks a pricing entry.

### 10.2 Cost accounting
`recordUsage()` is called by the abstraction layer itself (not by feature code — feature code can't forget it) after every completion/stream finalization: writes `UsageEvent` via Inngest event `usage/event.recorded` (non-blocking). Budget check `assertBudget(orgId, feature)` runs *before* the call: monthly plan quota + optional per-feature caps from `PLANS`. Over budget → `PlanLimitError`.

### 10.3 Tool framework
```ts
export function defineTool<I extends z.ZodType>(def: {
  name: string; description: string; input: I;
  requiresApproval?: boolean;       // surfaces APPROVAL step in agent runs
  execute: (input: z.infer<I>, ctx: ToolContext) => Promise<unknown>;
}): Tool
```
Registry in `packages/ai/src/tools/index.ts`. v1 built-in tools: `web_fetch` (allowlist-configurable), `db_query_readonly` (parameterized, SELECT-only, org-scoped), `send_email_draft` (requiresApproval), `r2_read`. ToolContext carries org/user/run identity — tools never receive raw session objects.

### 10.4 Chat scaffold
`/app/chat`: streaming UI (RSC + route handler with `ReadableStream`), markdown rendering, attachment upload, conversation persistence (`Conversation`/`Message` tables — add in this phase), tool-call rendering (collapsed step cards), stop button, per-message token/cost badge visible when `?debug=1`. This page is the template buyers clone for new AI features (verified prompt #7).

### 10.5 Rate limiting
`limit(key, max, windowSec)` over `RateLimitBucket` with atomic upsert; applied at: per-user per-feature RPM, per-org concurrent agent runs, per-IP on public endpoints. Postgres is sufficient for v1 traffic; `docs/agent/architecture-map.md` notes the Redis upgrade path as an invariant-preserving swap.

**Acceptance (AI layer):** same chat feature runs against Anthropic, OpenAI, and Ollama by changing env only; every message produces a UsageEvent with non-zero cost; tool call round-trips on at least two providers; budget exhaustion returns 402 with upgrade URL; rate limit returns 429 with Retry-After.

---

## 11. Multi-agent module (`packages/agents`, Pro tier)

### 11.1 Agent definition & registry
```ts
export function defineAgent(def: {
  slug: string;                      // "orchestrator", "researcher", ...
  description: string;               // used by orchestrator for routing
  modelTier: "fast" | "smart";
  system: string;                    // prompt template (typed params)
  tools: Tool[];
  subAgents?: string[];              // slugs this agent may delegate to
  maxSteps: number;                  // hard loop bound — REQUIRED
}): AgentDefinition
```
v1 ships: `orchestrator` (routes/delegates, no direct tools), `researcher` (web_fetch + memory), `writer` (memory read), `ops` (db_query_readonly + send_email_draft). Deliberately simple — they are teaching examples, the demo for prompt #10.

### 11.2 Execution engine
`runAgent(orgId, slug, input)` creates `AgentRun` then dispatches Inngest event `agent/run.requested`. The Inngest function loops: LLM call (with tools) → if tool_use: execute tool (or create APPROVAL step and `step.waitForEvent("agent/approval.granted")` if `requiresApproval`) → append result → continue, until final answer or `maxSteps`. Each iteration is an Inngest `step.run` writing an `AgentStep` row. Sub-agent delegation = nested `runAgent` recorded as a SUBAGENT step, with depth limit 3 and a shared run-level cost ceiling (`AGENT_RUN_COST_CAP_USD`, default $1, org-overridable) — exceeding it fails the run with a clear error. Cancellation: status flag checked between steps.

### 11.3 Run timeline UI
`/app/agents/runs/[id]`: vertical step timeline (type icon, name, duration, tokens, cost, collapsible input/output JSON), live-updating while RUNNING (poll 2s), approval banner with Approve/Reject for NEEDS_APPROVAL. This UI is a major demo asset — make it genuinely good (frontend-design pass).

### 11.4 Memory
`remember(orgId, kind, content, metadata)` → embed (provider abstraction, `text-embedding` tier) → `MemoryItem` with pgvector. `recall(orgId, query, { kind?, k })` → cosine top-k. Exposed to agents as `memory_save` / `memory_search` tools. Weekly prune cron deletes by configurable retention per kind.

### 11.5 Eval harness (`evals/`)
Scenario files:
```ts
export default defineEval({
  name: "researcher-cites-sources",
  agent: "researcher",
  input: { question: "..." },
  fixtures: { web_fetch: { "https://...": "canned html" } }, // tools mocked by default
  assert: async (run) => {
    expect(run.status).toBe("SUCCEEDED");
    expect(stepOfType(run, "TOOL_CALL", "web_fetch")).toBeDefined();
    await expectLlmJudge(run.outputText, "answer cites at least one source"); // cheap-model judge
  },
});
```
Runner: `pnpm eval [--filter name] [--live]` — executes against a real model (cheap tier) with mocked tools unless `--live`. Output: pass/fail table + total cost. CI runs the deterministic subset; full suite is the buyer-facing verification command referenced by the context layer (§12). Ship 6 scenarios covering each v1 agent + approval flow + cost-cap behavior.

**Acceptance (agents):** orchestrator delegates a research-then-write task across two sub-agents with full timeline; approval gate blocks `send_email_draft` until UI approve; killed worker resumes mid-run; cost cap aborts a runaway loop; `pnpm eval` passes 6/6.

---

## 12. Agent context layer (the X-factor — build with the most care)

This layer is documentation-as-product. Its quality bar: **a fresh Claude Code session with zero prior context completes all 18 verified prompts.** Authoring rules: imperative voice, file paths always absolute from repo root, one concept per section, every invariant stated as a checkable rule (something an agent could grep or run to verify), no marketing language.

### 12.1 `CLAUDE.md` (repo root) — required contents
1. **What this codebase is** (3 sentences) and the package map with one-line responsibilities.
2. **Golden rules** (the invariants):
   - All authz via `requireOrgRole` / `resolveApiKey`; never inline role checks.
   - All LLM calls via `packages/ai` abstraction; never import vendor SDKs in app code.
   - All async via Inngest; never fire-and-forget promises for side effects.
   - All env via the typed env module; never `process.env` in app code.
   - All external input validated with zod at the boundary.
   - All plan gating via `gate()` reading `PLANS`; quotas are data.
   - Every new AI feature must pass `metadata.feature` for cost accounting.
3. **How to verify your work** — the exact command sequence: `pnpm typecheck && pnpm lint && pnpm test && pnpm eval --ci`.
4. **Where things go** — decision table: "new AI feature → copy `/app/chat` pattern", "new tool → `packages/ai/src/tools/` + registry", "new agent → `packages/agents/src/agents/` + registry", "new email → `packages/emails` + EmailLog", "new cron → `apps/web/inngest/` + name convention".
5. **What not to touch** — migration files, `pricing.ts` without updating `lastVerified`, webhook signature verification.

### 12.2 `docs/agent/architecture-map.md`
Per package: purpose, public exports (the *only* things app code may import), data owned, invariants, extension points, known upgrade paths (e.g., RateLimit → Redis). Mermaid diagram of the flows in §2. Maximum 400 lines — terseness is a feature.

### 12.3 `.cursor/rules/` and `AGENTS.md`
Same golden rules re-expressed in Cursor's format; `AGENTS.md` is the vendor-neutral copy. Single source: write `docs/agent/rules.src.md` and generate all three with `scripts/gen-agent-context.ts` so they can never drift.

### 12.4 Verified prompt library (`docs/prompts/NN-slug.md`)
File format (every one of the 18):
```md
# 03 — Add team workspaces with per-seat billing
## Prompt (paste verbatim into your agent)
...exact text...
## Expected outcome
...observable result, user-visible...
## Files the agent should touch
...list (agent may reasonably differ; this is the reviewed reference)...
## Verify
...commands + manual click-path...
## Verified against
kit vX.Y.Z · Claude Code (model/version) · date · run cost
```
**Verification protocol (this is the kit's QA, run in Week 4–5):** fresh clone → fresh agent session → paste prompt → no human help besides approving file edits → run Verify section → if the agent stumbled, fix the *codebase or context layer* (never the prompt's promise) and re-run from fresh. Log every friction fix in `docs/human/CHANGELOG-verification.md` — this log is marketing material ("what it takes to make a codebase agent-proof").

### 12.5 Skills (`skills/`)
Five Claude Code skill folders mirroring the top tasks: `new-ai-feature`, `new-tool`, `new-agent`, `new-billing-tier`, `deploy-vps`. Each SKILL.md: trigger description, step list referencing golden rules, verify commands.

**Acceptance (context layer):** the 18/18 fresh-session bar; `gen-agent-context` output committed and CI-checked for drift; an outside tester (not Hassan) succeeds with prompts 1, 5, and 14.

---

## 13. Admin panel (`/admin`, isSuperAdmin only)

Pages: orgs list (plan, MRR-ish, 30-day token spend), org detail (members, subscription, usage chart by feature, recent agent runs), email log, global usage dashboard (cost by provider/model/day — reads rollups). Server-rendered tables, shadcn DataTable, no client state libraries. Purpose is operational truth, not beauty — but the usage chart appears in the demo video, so that one chart gets polish.

**Acceptance:** every UsageEvent visible within 1 min (post-Inngest); charts match a hand-run SQL sum.

---

## 14. Deployment

### 14.1 Vercel path (`deploy/vercel/README.md`)
Neon Postgres (pgvector enabled), Vercel project envs from `.env.example` (annotated — every var: what, where to get it, required-vs-optional), Inngest Cloud integration, Stripe webhook endpoint config, R2 CORS. Target: zero-to-deployed in under 30 minutes following the doc.

### 14.2 VPS path (`deploy/vps/`) — the differentiator path
- `docker-compose.yml`: app (multi-stage standalone Next build), postgres:16 + pgvector, inngest, nginx, certbot, minio (optional, profile-gated), watchtower (optional).
- `Caddyfile` alternative for buyers who prefer Caddy (one file, documented).
- GitHub Actions: `ci.yml` (typecheck/lint/test/eval --ci on PR) and `deploy.yml` (build → push GHCR image → SSH to VPS → `docker compose pull && up -d` → `prisma migrate deploy` → health check → rollback to previous tag on failure).
- `hardening.md`: non-root user, UFW, SSH keys only, fail2ban, unattended-upgrades, Postgres not exposed, backup cron (`pg_dump` → R2, 14-day retention, restore drill instructions).
- Tailscale appendix: private-only deployment (no public ingress) — your specialty; few kits offer this and it sells to the data-sovereign buyer.

**Acceptance (deploy):** both paths executed start-to-finish on clean accounts/servers by following only the docs (time them; the timings go in marketing); deploy rollback demonstrably works; restore drill recovers the seeded DB.

---

## 15. Security checklist (CI-enforced where possible)

- Webhooks: Stripe signature verification with raw body; Inngest signing key set.
- Secrets: only via typed env; `.env*` gitignored; `gitleaks` in CI.
- SQL: Prisma only; the one raw-SQL surface (`db_query_readonly` tool) is SELECT-parameterized + org-scoped + statement-timeout 5s.
- SSRF: `web_fetch` tool blocks private IP ranges and redirects-to-private; allowlist configurable.
- XSS: markdown rendering sanitized (rehype-sanitize), no `dangerouslySetInnerHTML` elsewhere (ESLint rule).
- AuthZ: integration tests for cross-org access on every resource type (the "tenant wall" suite).
- Headers: CSP (report-only v1), HSTS on VPS nginx config.
- Prompt injection: tool results wrapped in delimited untrusted blocks in agent context; `requiresApproval` on any externally-visible side effect; documented threat model in `docs/human/security.md` (buyers' diligence asks for this).

---

## 16. Testing strategy

| Layer | Tool | Scope |
|---|---|---|
| Unit | Vitest | pricing math, gate(), rate limiter, tool input validation, provider adapters (recorded fixtures) |
| Integration | Vitest + test Postgres (docker) | authz tenant wall, webhook handlers, usage write path, rollup idempotency |
| E2E | Playwright | signup → checkout (Stripe test) → chat message → usage visible; agent run with approval |
| Evals | `evals/` runner | 6 agent behavior scenarios |
| Meta | the 18 verified prompts | the product-level test (manual protocol §12.4) |

CI gate: typecheck, lint, unit+integration, eval `--ci`, gitleaks, context-drift check. E2E nightly, not per-PR.

---

## 17. Repo conventions (agents read this section verbatim — keep in sync with CLAUDE.md)

- **Errors:** typed error classes (`AuthzError`, `PlanLimitError`, `RateLimitError`, `ProviderError`) with `status`; one `toResponse(err)` mapper in route handlers; UI error boundary maps `PlanLimitError` → upgrade modal.
- **Server actions** for mutations from the UI; route handlers only for: webhooks, streaming, API-key access, Inngest.
- **Naming:** files kebab-case; DB camelCase fields; events `domain/noun.verb`; features (cost-accounting strings) snake_case and registered in `packages/ai/src/features.ts` (typo-proof union type).
- **Imports:** app code imports packages only via their `index.ts` public surface (ESLint boundary rule).
- **Comments:** every exported function has a one-line JSDoc stating *when to use it* (agents route on these).

---

## 18. Build sequence (maps to the 6-week plan; each phase ends green on CI)

| Phase | Scope (sections) | Exit criteria |
|---|---|---|
| 1 | Monorepo, env, db, auth, UI shell (§3–5) | Schema acceptance + auth acceptance pass; deployed to Vercel preview; landing page live |
| 2 | Billing, jobs, email, storage (§6–9) | All four acceptance blocks pass; E2E checkout green |
| 3 | AI layer (§10) | AI acceptance passes on 3 providers; chat scaffold demo-quality |
| 4 | Context layer v1 + prompts 1–9 (§12) | 9/9 fresh-session verification; friction log started |
| 5 | Agents module + evals + prompts 10–13 (§11), deploy paths + prompts 14–18 (§14) | 18/18 verified; both deploy paths timed |
| 6 | Admin polish (§13), security pass (§15), seed/demo data, launch assets | CI fully green; demo video recorded; v1.0.0 tagged |

**Working method:** Hassan drives Claude Code using this document; each phase begins by pasting the relevant sections as the work order. The kit is thus built the same way it will be used — dogfooding from hour one, and every friction encountered while building feeds the context layer.

## 19. Definition of done (v1.0.0)

1. All section acceptance criteria pass, recorded in `docs/human/acceptance-run.md` with dates.
2. 18/18 prompts verified, with version stamps, by at least one fresh session each; prompts 1, 5, 14 additionally verified by an external tester.
3. Both deployment paths completed from docs alone, timed under 30 min (Vercel) / 60 min (VPS).
4. CI green; `gitleaks` clean; tenant-wall suite passes.
5. Seed data makes every dashboard non-empty on first boot.
6. Demo video recorded against the tagged release, not a dev branch.

---

*End of technical build document v1.0. Companion: agent-native-kit-spec.md (business/launch). Next artifacts to produce from this doc: Phase 1 work order prompts, landing page copy.*
