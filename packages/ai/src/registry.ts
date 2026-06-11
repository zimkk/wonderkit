import type { LlmProvider } from "./types";
import { AnthropicProvider } from "./providers/anthropic";
import { OpenAIProvider, OpenRouterProvider } from "./providers/openai";
import { OllamaProvider } from "./providers/ollama";

export type ProviderId = "anthropic" | "openai" | "openrouter" | "ollama";

const registry = new Map<ProviderId, LlmProvider>();

/** Lazy-initialise and cache providers based on available env vars. */
export function getProvider(id: ProviderId): LlmProvider {
  if (registry.has(id)) return registry.get(id)!;
  let p: LlmProvider;
  if (id === "anthropic") p = new AnthropicProvider();
  else if (id === "openai") p = new OpenAIProvider();
  else if (id === "openrouter") p = new OpenRouterProvider();
  else p = new OllamaProvider();
  registry.set(id, p);
  return p;
}

/** Resolve the best available provider in priority order: Anthropic → OpenAI → OpenRouter → Ollama. */
export function defaultProvider(): LlmProvider {
  if (process.env.ANTHROPIC_API_KEY) return getProvider("anthropic");
  if (process.env.OPENAI_API_KEY) return getProvider("openai");
  if (process.env.OPENROUTER_API_KEY) return getProvider("openrouter");
  return getProvider("ollama");
}
