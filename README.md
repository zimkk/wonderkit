# WonderKit

**The open-source, agent-native AI SaaS starter kit.**

A fresh Claude Code session, given only this repo, can add a new AI feature, billing tier, or multi-agent workflow — without human rescue. That's the bar WonderKit is built to clear.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![CI](https://github.com/zimkk/wonderkit/actions/workflows/ci.yml/badge.svg)](https://github.com/zimkk/wonderkit/actions/workflows/ci.yml)

---

## What's inside

| Layer | Tech | What it gives you |
|---|---|---|
| Framework | Next.js 15 App Router | RSC, streaming, server actions |
| Database | PostgreSQL 16 + pgvector | Relational data + vector memory |
| ORM | Prisma 6 | Type-safe queries, migrations |
| Auth | Auth.js v5 | Magic link, Google, GitHub — feature-detect |
| Billing | Stripe | Subscriptions + metered token overage |
| Jobs | Inngest | Durable agent runs, crons, retries |
| Email | Resend + React Email | Typed templates, dev console transport |
| Storage | Cloudflare R2 | Presigned uploads, org-scoped authz |
| AI | Provider abstraction | Swap Anthropic / OpenAI / OpenRouter / Ollama via env |
| Agents | Multi-agent runtime | Orchestrator, researcher, writer, ops — persisted to DB |
| Monorepo | Turborepo + pnpm | `apps/web` + shared `packages/*` |
| Deploy | Vercel or VPS | Docker Compose + GitHub Actions CI/CD |

---

## Quickstart

**Requirements:** Node 22+, pnpm 10+, Docker Desktop

```bash
git clone https://github.com/zimkk/wonderkit.git
cd wonderkit

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env — only DATABASE_URL and AUTH_SECRET are required to start

# Start local Postgres with pgvector
docker compose -f docker-compose.dev.yml up -d

# Run migrations and seed demo data
pnpm --filter @kit/db exec prisma migrate dev
pnpm --filter @kit/db exec prisma db seed

# Start the dev server
pnpm dev
```

Open **http://localhost:3000**. Enter any email on the login page — the magic link prints to your terminal (no Resend key needed in dev).

---

## Project structure

```
wonderkit/
├── apps/
│   └── web/                   # Next.js 15 app (dashboard, API, marketing)
│       ├── src/app/           # App Router pages & layouts
│       ├── src/auth.ts        # Auth.js v5 config
│       ├── src/env.ts         # Typed env (t3-env) — never read process.env directly
│       ├── src/lib/           # stripe.ts, billing.ts, org.ts
│       └── inngest/           # Inngest client + functions
├── packages/
│   ├── db/                    # Prisma schema, requireOrgRole, gate(), PLANS, typed errors
│   ├── ai/                    # LLM provider abstraction, pricing table, rate limiter
│   ├── agents/                # defineAgent, runAgent, 4 built-in agents, eval harness
│   ├── emails/                # 5 React Email templates + sendEmail()
│   ├── storage/               # R2/MinIO signed URL helpers
│   └── ui/                    # Shared React primitives (Button, Card, cn)
├── docs/
│   ├── agent/                 # Architecture map for coding agents
│   └── prompts/               # 9 verified agent prompts (base → eval judge)
├── skills/                    # Reusable agent skill cards
├── deploy/
│   ├── vercel/                # Vercel deploy guide
│   └── vps/                   # Docker Compose + Dockerfile for self-hosting
├── AGENTS.md                  # Agent operating manual — read before coding
├── CLAUDE.md                  # Golden rules enforced by ESLint boundary rules
└── PROVENANCE.md              # Authorship + dependency attribution
```

---

## Agent-native design

WonderKit is the only starter kit built around the question: *can a coding agent extend this without human rescue?*

Every convention is a checkable rule:

```
// All authz via requireOrgRole — never inline role checks
// All LLM calls via packages/ai — never import vendor SDKs in app code
// All async side effects via Inngest — never fire-and-forget promises
// All env via @/env — never read process.env directly
// All plan gating via gate() reading PLANS — quotas are data, not code
```

`CLAUDE.md` at the repo root tells any coding agent exactly where things go, what not to touch, and how to verify its work. `AGENTS.md` is the full operating manual. `docs/prompts/` has 9 verified prompts covering every agent persona.

---

## Features

### Auth (zero config in dev)
- Magic link sign-in — URL prints to terminal when `RESEND_API_KEY` is unset
- Optional Google + GitHub OAuth (auto-detected from env)
- Database sessions via Auth.js v5 + Prisma adapter
- Auto-creates org + FREE subscription on first sign-in

### Multi-tenant organisations
- One user → many orgs, one active at a time (cookie-based switcher)
- Roles: `OWNER > ADMIN > MEMBER`
- `requireOrgRole(session, orgId, role)` is the single authz primitive — no inline checks anywhere

### Billing (Stripe)
- Free / Starter ($29) / Pro ($99) plans defined as data in `packages/db/src/plans.ts`
- `gate(orgId, feature)` throws `PlanLimitError(402)` when over quota
- Stripe Checkout + Customer Portal via server actions
- Webhook: raw body + signature verification — handles `checkout.session.completed`, `subscription.updated/deleted`, `invoice.payment_failed`
- Inngest events emitted for all billing side effects

### AI provider layer
- `LlmProvider` interface implemented for Anthropic, OpenAI, OpenRouter, and Ollama
- `defaultProvider()` auto-selects based on available env vars
- Pricing table with `costUsd()` for per-request cost tracking
- Streaming chat with SSE — token costs written to `UsageEvent` after each response

### Multi-agent runtime
- `defineAgent(config)` registers agents in a global registry
- `runAgent(agentId, ctx)` persists `AgentRun` + `AgentStep` to the database
- 4 built-in agents: **Orchestrator**, **Researcher**, **Writer**, **Ops**
- pgvector semantic memory: `storeMemory()` + `retrieveMemories()`
- Eval harness: `pnpm --filter @kit/agents eval --agent orchestrator --suite basic`

### Email
- 5 typed templates: `WelcomeEmail`, `MagicLinkEmail`, `InviteEmail`, `PaymentFailedEmail`, `UsageAlertEmail`
- `sendEmail(template, props, to)` — logs HTML to console in dev, sends via Resend in prod

### Jobs (Inngest)
- Nightly usage rollup cron (`UsageEvent` → `UsageDailyRollup`)
- `onPaymentFailed` → sends `PaymentFailedEmail`
- `onSubscriptionProvisioned` → sends `WelcomeEmail`
- Dev works without `INNGEST_EVENT_KEY` (uses `"local"` key)

---

## Plans & billing

| Plan | Tokens/month | Agents | Members | Price |
|---|---|---|---|---|
| Free | 100K | — | 1 | $0 |
| Starter | 2M | — | 5 | $29/mo |
| Pro | 10M | 10 | 25 | $99/mo |

Plans are data, not code — defined in [`packages/db/src/plans.ts`](packages/db/src/plans.ts). Changing a quota or adding a feature flag is a one-line edit.

---

## Environment variables

Only two variables are required to run locally:

```bash
DATABASE_URL=postgresql://wonderkit:wonderkit@localhost:5433/wonderkit
AUTH_SECRET=<openssl rand -base64 32>
```

Everything else is optional and feature-detected at startup. See [`.env.example`](.env.example) for the full annotated list.

---

## Deployment

**Vercel** (fastest): connect repo → add env vars → deploy. See [`deploy/vercel/README.md`](deploy/vercel/README.md).

**Self-host**: Docker Compose stack (app + postgres). See [`deploy/vps/docker-compose.yml`](deploy/vps/docker-compose.yml) and the `Dockerfile`.

**CI**: GitHub Actions runs typecheck → build → Prisma migrate on every push to `main`. See [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

---

## Roadmap

- [x] Phase 1 — Monorepo, auth, DB schema, dashboard shell
- [x] Phase 2 — Stripe billing, Inngest jobs, email templates, R2 storage
- [x] Phase 3 — AI provider layer (Anthropic/OpenAI/OpenRouter/Ollama), streaming chat
- [x] Phase 4 — Agent context layer, AGENTS.md, 9 verified prompts, skills
- [x] Phase 5 — Multi-agent runtime, pgvector memory, eval harness
- [x] Phase 6 — Admin panel, deploy guides (Vercel + VPS), GitHub Actions CI
- [ ] Invitation flow + team management UI
- [ ] API key management UI
- [ ] Usage alerts (email at 80% quota)
- [ ] Stripe metered billing for token overage
- [ ] Demo video + hosted demo

---

## Contributing

Issues and PRs welcome. Read `AGENTS.md` before contributing — it's the same guide the AI coding agents use, and it tells you exactly where new code goes.

---

## License

MIT © [Hassan Nazir](https://github.com/zimkk) — see [LICENSE](LICENSE).
