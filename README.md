# WonderKit

**The open-source, agent-native AI SaaS starter kit.**

A fresh Claude Code session, given only this repo, can add a new AI feature, billing tier, or multi-agent workflow — without human rescue. That's the bar WonderKit is built to clear.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)

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
| AI | Provider abstraction | Swap Anthropic / OpenAI / Ollama via env |
| Agents | Multi-agent runtime | Orchestrator, sub-agents, approval gates |
| Monorepo | Turborepo + pnpm | `apps/web` + shared `packages/*` |
| Deploy | Vercel or VPS | Docker Compose + GitHub Actions CI/CD |

---

## Quickstart

**Requirements:** Node 20+, pnpm, Docker Desktop

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
pnpm db:migrate
pnpm db:seed

# Start the dev server
pnpm dev
```

Open **http://localhost:3000**. Enter any email on the login page — the magic link prints to your terminal (no Resend key needed in dev).

---

## Project structure

```
wonderkit/
├── apps/
│   └── web/                  # Next.js 15 app (dashboard, API, marketing)
│       ├── src/app/          # App Router pages & layouts
│       ├── src/auth.ts       # Auth.js v5 config
│       ├── src/env.ts        # Typed env (t3-env) — never read process.env directly
│       └── src/middleware.ts # Route protection
├── packages/
│   ├── db/                   # Prisma schema, requireOrgRole, PLANS, typed errors
│   ├── ai/                   # LLM provider abstraction, tools, cost accounting
│   ├── agents/               # Multi-agent orchestrator, memory, eval harness
│   └── ui/                   # Shared React primitives (Button, Card, cn)
├── CLAUDE.md                 # Golden rules for coding agents
└── docs/
    ├── human/                # Technical build doc, acceptance log
    └── prompts/              # 18 verified agent prompts
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
// All plan gating via gate() reading PLANS — quotas are data
```

`CLAUDE.md` at the repo root tells any coding agent exactly where things go, what not to touch, and how to verify its work. The kit ships with 18 verified prompts — tasks that a fresh agent session completes without intervention.

---

## Plans & billing

| Plan | Tokens/month | Agents | Members |
|---|---|---|---|
| Free | 100K | — | 1 |
| Starter | 2M | — | 5 |
| Pro | 10M | 10 | 25 |

Plans are data, not code — defined in `packages/db/src/plans.ts`. Changing a quota is a one-line edit.

---

## Deployment

**Vercel** (fastest path): connect repo → add env vars from `.env.example` → deploy. Uses Neon Postgres and Inngest Cloud.

**VPS / self-host**: Docker Compose stack (app + postgres + inngest + nginx + certbot), GitHub Actions CI/CD with automatic rollback. Tailscale appendix for private-only deployments. Full guide in `deploy/vps/`.

---

## Roadmap

- [x] Phase 1 — Monorepo, auth, DB schema, dashboard shell
- [ ] Phase 2 — Stripe billing, Inngest jobs, email, R2 storage
- [ ] Phase 3 — AI layer (provider abstraction, chat scaffold, cost accounting)
- [ ] Phase 4 — Agent context layer + verified prompts 1–9
- [ ] Phase 5 — Multi-agent module, memory, eval harness
- [ ] Phase 6 — Admin panel, deploy paths, demo video, v1.0.0

---

## Contributing

Issues and PRs welcome. Please read `CLAUDE.md` before contributing — it's the same guide the coding agents use.

---

## License

MIT © [Hassan Nazir](https://github.com/zimkk)
