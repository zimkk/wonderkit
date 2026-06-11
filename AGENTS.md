# WonderKit — Agent Operating Manual

This file is the entry point for any autonomous coding agent (Claude Code, Cursor, Copilot Workspace, etc.) working in this repo. Read it before writing a single line of code.

## 1. Project topology

```
apps/web          — Next.js 15 App Router front-end + API routes
packages/db       — Prisma client, schema, authz helpers, plans, errors
packages/ai       — Provider-agnostic LLM layer (Anthropic / OpenAI / OpenRouter / Ollama)
packages/agents   — Multi-agent runtime: defineAgent, runAgent, orchestrators
packages/emails   — React Email templates + sendEmail()
packages/storage  — R2 / MinIO signed URL helpers
packages/ui       — Shared React components + cn()
```

## 2. Non-negotiable rules (CLAUDE.md §1–§9 condensed)

| Rule | What it means |
|------|--------------|
| **No raw `process.env`** | Import from `@/env` in app code. |
| **No inline role checks** | Always call `requireOrgRole(session, orgId, role)` or `resolveApiKey(header)`. |
| **Gate before every plan-gated op** | `await gate(orgId, "featureKey")` — throws `PlanLimitError(402)` when over quota. |
| **Webhook raw body** | Never buffer or parse before Stripe signature verification. |
| **API keys: hash only** | `hashApiKey(plain)` — plaintext never stored or logged. |
| **Typed errors** | Throw `AuthzError` / `PlanLimitError` / `RateLimitError` / `ProviderError`. Catch in route handlers with `toResponse(err)`. |
| **No comments that explain what** | Only explain *why* (hidden constraints, workarounds). |
| **One authz pattern** | Session auth → `requireOrgRole`. Bearer auth → `resolveApiKey`. No third path. |

## 3. How to add a new feature

1. **Check the plan gate** — does this feature need a `PlanFeatures` key? If so, add it to `packages/db/src/plans.ts` first.
2. **Server action or route handler** — start with `requireOrgRole(session, orgId, "MEMBER")` (or higher).
3. **Async work** → write an Inngest function, not an inline `setTimeout`.
4. **Email** → call `sendEmail(template, props, to)` from `@kit/emails`.
5. **Storage** → call `getUploadUrl(key, contentType)` from `@kit/storage`.
6. **AI completion** → use `defaultProvider()` or `getProvider(id)` from `@kit/ai`. Never import `@anthropic-ai/sdk` directly in app code.

## 4. Verified prompts catalogue

See `docs/prompts/` for the numbered prompt library:

| # | File | Purpose |
|---|------|---------|
| 1 | `01-system-base.md` | Base system prompt for all agents |
| 2 | `02-tool-use.md` | Tool calling conventions |
| 3 | `03-memory-retrieval.md` | pgvector memory read/write |
| 4 | `04-orchestrator.md` | Orchestrator → sub-agent delegation |
| 5 | `05-researcher.md` | Research agent persona |
| 6 | `06-writer.md` | Writer agent persona |
| 7 | `07-ops.md` | Ops / automation agent |
| 8 | `08-safety-rails.md` | Output safety constraints |
| 9 | `09-eval-judge.md` | Eval harness judge prompt |

## 5. Skills catalogue

See `skills/` — each file is a self-contained skill loadable by any agent.

## 6. Testing new agents

```bash
# Run the eval harness against a single agent
pnpm --filter @kit/agents eval --agent orchestrator --suite basic

# Inspect an agent run from the DB
psql $DATABASE_URL -c "SELECT * FROM \"AgentRun\" ORDER BY \"createdAt\" DESC LIMIT 5;"
```

## 7. Environment quick-ref

| Variable | Required | Default |
|----------|----------|---------|
| `DATABASE_URL` | Yes | — |
| `AUTH_SECRET` | Yes | — |
| `ANTHROPIC_API_KEY` | For Anthropic | — |
| `OPENAI_API_KEY` | For OpenAI | — |
| `OLLAMA_BASE_URL` | For Ollama | `http://localhost:11434` |
| `INNGEST_EVENT_KEY` | Prod only | `"local"` |
| `STRIPE_SECRET_KEY` | Billing only | — |
| `RESEND_API_KEY` | Email prod | console in dev |
| `R2_ENDPOINT` | Storage | — |
