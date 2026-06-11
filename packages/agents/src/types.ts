import { z } from "zod";
import type { Message } from "@kit/ai";

export const AgentConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  systemPrompt: z.string(),
  model: z.string().optional(),
  maxSteps: z.number().int().positive().default(10),
  tools: z.array(z.string()).default([]),
});
export type AgentConfig = z.infer<typeof AgentConfigSchema>;

export interface AgentContext {
  orgId: string;
  userId: string | null;
  runId: string;
  messages: Message[];
  metadata: Record<string, unknown>;
}

export interface AgentStep {
  type: "tool_call" | "tool_result" | "message" | "error";
  content: string;
  metadata?: Record<string, unknown>;
}

export interface AgentResult {
  runId: string;
  output: string;
  steps: AgentStep[];
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}
