import OpenAI from "openai";
import type { LlmProvider, Message, CompletionOptions, CompletionResult, StreamChunk } from "../types";

export class OpenAIProvider implements LlmProvider {
  readonly id: string = "openai";
  readonly defaultModel: string = "gpt-4o";
  private client: OpenAI;

  constructor(apiKey?: string, baseURL?: string) {
    this.client = new OpenAI({ apiKey: apiKey ?? process.env.OPENAI_API_KEY, baseURL });
  }

  async complete(messages: Message[], options: CompletionOptions = {}): Promise<CompletionResult> {
    const msgs = options.systemPrompt
      ? [{ role: "system" as const, content: options.systemPrompt }, ...messages.map(toOAI)]
      : messages.map(toOAI);

    const res = await this.client.chat.completions.create({
      model: options.model ?? this.defaultModel,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
      messages: msgs,
    });

    const choice = res.choices[0];
    return {
      content: choice?.message?.content ?? "",
      inputTokens: res.usage?.prompt_tokens ?? 0,
      outputTokens: res.usage?.completion_tokens ?? 0,
      model: res.model,
      finishReason: choice?.finish_reason ?? "stop",
    };
  }

  async *stream(messages: Message[], options: CompletionOptions = {}): AsyncIterable<StreamChunk> {
    const msgs = options.systemPrompt
      ? [{ role: "system" as const, content: options.systemPrompt }, ...messages.map(toOAI)]
      : messages.map(toOAI);

    const stream = await this.client.chat.completions.create({
      model: options.model ?? this.defaultModel,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
      messages: msgs,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? "";
      if (delta) yield { delta, done: false };
    }
    yield { delta: "", done: true };
  }
}

/** OpenRouter uses the OpenAI SDK — just pass a different baseURL + key. */
export class OpenRouterProvider extends OpenAIProvider {
  override readonly id: string = "openrouter";
  override readonly defaultModel: string = "anthropic/claude-sonnet-4-6";

  constructor(apiKey?: string) {
    super(apiKey ?? process.env.OPENROUTER_API_KEY, "https://openrouter.ai/api/v1");
  }
}

function toOAI(m: Message): OpenAI.Chat.ChatCompletionMessageParam {
  return { role: m.role as "user" | "assistant" | "system", content: m.content };
}
