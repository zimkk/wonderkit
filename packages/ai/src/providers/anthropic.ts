import Anthropic from "@anthropic-ai/sdk";
import type { LlmProvider, Message, CompletionOptions, CompletionResult, StreamChunk } from "../types";

export class AnthropicProvider implements LlmProvider {
  readonly id = "anthropic";
  readonly defaultModel = "claude-sonnet-4-6";
  private client: Anthropic;

  constructor(apiKey?: string) {
    this.client = new Anthropic({ apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY });
  }

  async complete(messages: Message[], options: CompletionOptions = {}): Promise<CompletionResult> {
    const system = options.systemPrompt ?? messages.find((m) => m.role === "system")?.content;
    const userMessages = messages.filter((m) => m.role !== "system");

    const res = await this.client.messages.create({
      model: options.model ?? this.defaultModel,
      max_tokens: options.maxTokens ?? 4096,
      temperature: options.temperature,
      system,
      messages: userMessages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    });

    const content = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    return {
      content,
      inputTokens: res.usage.input_tokens,
      outputTokens: res.usage.output_tokens,
      model: res.model,
      finishReason: res.stop_reason ?? "stop",
    };
  }

  async *stream(messages: Message[], options: CompletionOptions = {}): AsyncIterable<StreamChunk> {
    const system = options.systemPrompt ?? messages.find((m) => m.role === "system")?.content;
    const userMessages = messages.filter((m) => m.role !== "system");

    const stream = this.client.messages.stream({
      model: options.model ?? this.defaultModel,
      max_tokens: options.maxTokens ?? 4096,
      temperature: options.temperature,
      system,
      messages: userMessages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield { delta: event.delta.text, done: false };
      }
    }
    yield { delta: "", done: true };
  }
}
