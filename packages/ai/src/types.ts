import { z } from "zod";

export const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});
export type Message = z.infer<typeof MessageSchema>;

export interface CompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  tools?: LlmTool[];
  systemPrompt?: string;
}

export interface CompletionResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
  finishReason: "stop" | "length" | "tool_calls" | string;
}

export interface StreamChunk {
  delta: string;
  done: boolean;
}

export interface LlmTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

/** Contract every provider adapter must satisfy. */
export interface LlmProvider {
  readonly id: string;
  readonly defaultModel: string;
  complete(messages: Message[], options?: CompletionOptions): Promise<CompletionResult>;
  stream(messages: Message[], options?: CompletionOptions): AsyncIterable<StreamChunk>;
}
