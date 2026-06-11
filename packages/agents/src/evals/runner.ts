/**
 * Eval harness — runs agent against test cases and scores output via the judge prompt.
 * Usage: pnpm --filter @kit/agents eval --agent orchestrator --suite basic
 */
import { parseArgs } from "util";
import { runAgent } from "../run-agent";
import { defaultProvider } from "@kit/ai";
import type { Message } from "@kit/ai";

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    agent: { type: "string", default: "orchestrator" },
    suite: { type: "string", default: "basic" },
  },
});

const SUITES: Record<string, Array<{ input: string; passCriteria: string }>> = {
  basic: [
    { input: "What is 2 + 2?", passCriteria: "Response contains the number 4" },
    { input: "Summarise: The sky is blue.", passCriteria: "Response mentions sky or blue" },
  ],
};

async function main() {
  const agentId = values.agent ?? "orchestrator";
  const suiteName = values.suite ?? "basic";
  const cases = SUITES[suiteName];

  if (!cases) {
    console.error(`Unknown suite: ${suiteName}. Available: ${Object.keys(SUITES).join(", ")}`);
    process.exit(1);
  }

  console.log(`\nEval: agent=${agentId} suite=${suiteName} cases=${cases.length}\n`);

  const judgeProvider = defaultProvider();
  let passed = 0;

  for (const [i, tc] of cases.entries()) {
    console.log(`[${i + 1}/${cases.length}] ${tc.input}`);

    const result = await runAgent(agentId, {
      orgId: "eval",
      userId: null,
      runId: `eval-${Date.now()}`,
      messages: [{ role: "user", content: tc.input }],
      metadata: { eval: true },
    });

    const judgePrompt: Message[] = [
      {
        role: "system",
        content: `You are an eval judge. Output ONLY valid JSON: {"pass": boolean, "score": 0-10, "reason": "..."}`,
      },
      {
        role: "user",
        content: `Agent output: "${result.output}"\nPass criteria: "${tc.passCriteria}"\nDoes it pass?`,
      },
    ];

    const judgment = await judgeProvider.complete(judgePrompt);
    const parsed = JSON.parse(judgment.content) as { pass: boolean; score: number; reason: string };
    if (parsed.pass) passed++;
    console.log(`  → ${parsed.pass ? "PASS" : "FAIL"} (${parsed.score}/10) ${parsed.reason}`);
  }

  console.log(`\nResult: ${passed}/${cases.length} passed`);
  process.exit(passed === cases.length ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
