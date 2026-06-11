export class AiError extends Error { constructor(msg: string, public code = "AI_ERROR") { super(msg); } }
export class RateLimitError extends AiError { constructor(msg: string) { super(msg, "RATE_LIMITED"); } }
export class ProviderUnavailableError extends AiError { constructor(provider: string) { super(`Provider ${provider} is not configured`, "PROVIDER_UNAVAILABLE"); } }
