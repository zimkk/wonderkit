// Seed script (§4 migration policy): demo org, owner user, FREE subscription, sample usage
// events, and one sample agent run with steps — so dashboards are never empty on first boot.
// Idempotent: safe to run repeatedly.

import { PrismaClient, RunStatus, StepType } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const user = await db.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: {
      email: "demo@example.com",
      name: "Demo Owner",
      emailVerified: new Date(),
      isSuperAdmin: true,
    },
  });

  const org = await db.organization.upsert({
    where: { slug: "demo" },
    update: {},
    create: { name: "Demo Org", slug: "demo" },
  });

  await db.membership.upsert({
    where: { userId_orgId: { userId: user.id, orgId: org.id } },
    update: { role: "OWNER" },
    create: { userId: user.id, orgId: org.id, role: "OWNER" },
  });

  await db.subscription.upsert({
    where: { orgId: org.id },
    update: {},
    create: { orgId: org.id, stripeCustomerId: `seed_${org.id}`, plan: "FREE", status: "ACTIVE" },
  });

  // Sample usage events spread over the last 14 days so charts have a curve.
  const existingUsage = await db.usageEvent.count({ where: { orgId: org.id } });
  if (existingUsage === 0) {
    const features = ["chat", "summarizer"] as const;
    const events = Array.from({ length: 42 }, (_, i) => {
      const daysAgo = i % 14;
      const inputTokens = 500 + ((i * 137) % 1500);
      const outputTokens = 200 + ((i * 89) % 900);
      return {
        orgId: org.id,
        userId: user.id,
        feature: features[i % features.length]!,
        provider: "anthropic",
        model: "claude-haiku-4-5",
        inputTokens,
        outputTokens,
        // Haiku-ish pricing applied at write time, as the AI layer will do for real events.
        costUsd: (inputTokens * 1 + outputTokens * 5) / 1_000_000,
        createdAt: new Date(Date.now() - daysAgo * 86_400_000 - (i % 8) * 3_600_000),
      };
    });
    await db.usageEvent.createMany({ data: events });
  }

  // One sample agent run with a realistic step timeline.
  const existingRun = await db.agentRun.findFirst({ where: { orgId: org.id } });
  if (!existingRun) {
    const startedAt = new Date(Date.now() - 3_600_000);
    await db.agentRun.create({
      data: {
        orgId: org.id,
        userId: user.id,
        agent: "researcher",
        status: RunStatus.SUCCEEDED,
        input: { question: "Summarize recent trends in LLM cost optimization." },
        output: { answer: "Costs are falling ~10x/18mo; caching and routing dominate savings." },
        costUsd: 0.0142,
        startedAt,
        finishedAt: new Date(startedAt.getTime() + 42_000),
        steps: {
          create: [
            {
              index: 0,
              type: StepType.LLM_CALL,
              name: "claude-fable-5",
              input: { messages: 1 },
              output: { tool_use: "web_fetch" },
              tokens: 1850,
              costUsd: 0.006,
              durationMs: 2900,
            },
            {
              index: 1,
              type: StepType.TOOL_CALL,
              name: "web_fetch",
              input: { url: "https://example.com/llm-costs" },
              output: { status: 200, bytes: 18234 },
              durationMs: 1100,
            },
            {
              index: 2,
              type: StepType.LLM_CALL,
              name: "claude-fable-5",
              input: { messages: 3 },
              output: { final: true },
              tokens: 2400,
              costUsd: 0.0082,
              durationMs: 3800,
            },
            {
              index: 3,
              type: StepType.NOTE,
              name: "run-complete",
              output: { summary: "Answer produced with one source fetched." },
            },
          ],
        },
      },
    });
  }

  console.log(`Seeded: user demo@example.com · org "${org.slug}" · usage events + 1 agent run`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
