// lastVerified: 2026-01-01 — update only when prices confirmed at source
export const MODEL_PRICING: Record<string, { inputPer1M: number; outputPer1M: number }> = {
  // Anthropic
  "claude-sonnet-4-6":          { inputPer1M: 3.00,  outputPer1M: 15.00 },
  "claude-haiku-4-5-20251001":  { inputPer1M: 0.80,  outputPer1M: 4.00  },
  "claude-opus-4-8":            { inputPer1M: 15.00, outputPer1M: 75.00 },
  // OpenAI
  "gpt-4o":                     { inputPer1M: 2.50,  outputPer1M: 10.00 },
  "gpt-4o-mini":                { inputPer1M: 0.15,  outputPer1M: 0.60  },
  "o3-mini":                    { inputPer1M: 1.10,  outputPer1M: 4.40  },
  // Ollama (local, no cost)
  "llama3.2":                   { inputPer1M: 0,     outputPer1M: 0     },
  "mistral":                    { inputPer1M: 0,     outputPer1M: 0     },
};

export function costUsd(model: string, inputTokens: number, outputTokens: number): number {
  const p = MODEL_PRICING[model] ?? { inputPer1M: 0, outputPer1M: 0 };
  return (inputTokens * p.inputPer1M + outputTokens * p.outputPer1M) / 1_000_000;
}
