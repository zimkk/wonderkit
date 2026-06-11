import { db } from "@kit/db";
import { defaultProvider, costUsd } from "@kit/ai";
import type { Message } from "@kit/ai";
import { getAgent } from "./define-agent";
import type { AgentContext, AgentResult, AgentStep } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonAny = any;

export async function runAgent(agentId: string, ctx: AgentContext): Promise<AgentResult> {
  const config = getAgent(agentId);
  const provider = defaultProvider();
  const start = Date.now();

  const run = await db.agentRun.create({
    data: {
      orgId: ctx.orgId,
      agent: agentId,
      status: "RUNNING",
      input: { messages: ctx.messages, metadata: ctx.metadata } as JsonAny,
      startedAt: new Date(),
    },
  });

  const steps: AgentStep[] = [];
  const history: Message[] = [{ role: "system", content: config.systemPrompt }, ...ctx.messages];

  let inputTokens = 0;
  let outputTokens = 0;
  let output = "";

  try {
    for (let stepIdx = 0; stepIdx < (config.maxSteps ?? 10); stepIdx++) {
      const result = await provider.complete(history, {
        model: config.model,
        systemPrompt: config.systemPrompt,
      });

      inputTokens += result.inputTokens;
      outputTokens += result.outputTokens;
      output = result.content;

      steps.push({ type: "message", content: result.content });
      history.push({ role: "assistant", content: result.content });

      await db.agentStep.create({
        data: {
          runId: run.id,
          index: stepIdx,
          type: "LLM_CALL",
          name: provider.defaultModel,
          input: { history } as JsonAny,
          output: result.content,
          tokens: result.inputTokens + result.outputTokens,
        },
      });

      if (result.finishReason === "stop") break;
    }

    const durationMs = Date.now() - start;
    const usd = costUsd(provider.defaultModel, inputTokens, outputTokens);

    await db.agentRun.update({
      where: { id: run.id },
      data: {
        status: "SUCCEEDED",
        output: output as JsonAny,
        finishedAt: new Date(),
        costUsd: usd,
      },
    });

    await db.usageEvent.create({
      data: {
        orgId: ctx.orgId,
        feature: "agent_run",
        provider: provider.id,
        model: provider.defaultModel,
        inputTokens,
        outputTokens,
        costUsd: usd,
        metadata: { agentId, runId: run.id } as JsonAny,
      },
    });

    return { runId: run.id, output, steps, inputTokens, outputTokens, durationMs };
  } catch (err) {
    await db.agentRun.update({
      where: { id: run.id },
      data: { status: "FAILED", error: String(err), finishedAt: new Date() },
    });
    throw err;
  }
}
