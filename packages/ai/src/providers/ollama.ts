import type { LlmProvider, Message, CompletionOptions, CompletionResult, StreamChunk } from "../types";

/** Ollama local provider — uses the OpenAI-compatible /api/chat endpoint. */
export class OllamaProvider implements LlmProvider {
  readonly id = "ollama";
  readonly defaultModel = "llama3.2";
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
  }

  async complete(messages: Message[], options: CompletionOptions = {}): Promise<CompletionResult> {
    const body = {
      model: options.model ?? this.defaultModel,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: false,
      options: { temperature: options.temperature, num_predict: options.maxTokens },
    };

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`Ollama error: ${res.status} ${await res.text()}`);
    const data = await res.json() as { message: { content: string }; eval_count?: number; prompt_eval_count?: number; model: string };

    return {
      content: data.message.content,
      inputTokens: data.prompt_eval_count ?? 0,
      outputTokens: data.eval_count ?? 0,
      model: data.model,
      finishReason: "stop",
    };
  }

  async *stream(messages: Message[], options: CompletionOptions = {}): AsyncIterable<StreamChunk> {
    const body = {
      model: options.model ?? this.defaultModel,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
      options: { temperature: options.temperature, num_predict: options.maxTokens },
    };

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`Ollama error: ${res.status}`);
    const reader = res.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value).split("\n").filter(Boolean);
      for (const line of lines) {
        const chunk = JSON.parse(line) as { message?: { content?: string }; done?: boolean };
        if (chunk.message?.content) yield { delta: chunk.message.content, done: false };
        if (chunk.done) yield { delta: "", done: true };
      }
    }
  }
}
