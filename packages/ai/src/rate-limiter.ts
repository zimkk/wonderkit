import { RateLimitError } from "./errors";

interface Bucket { tokens: number; lastRefill: number; }
const buckets = new Map<string, Bucket>();

/**
 * In-memory sliding-window rate limiter (single instance per process).
 * For multi-replica deployments, replace with Redis-backed Upstash.
 */
export function checkRateLimit(key: string, maxPerMinute: number): void {
  const now = Date.now();
  const b = buckets.get(key) ?? { tokens: maxPerMinute, lastRefill: now };

  // Refill based on elapsed time
  const elapsed = (now - b.lastRefill) / 60_000;
  b.tokens = Math.min(maxPerMinute, b.tokens + elapsed * maxPerMinute);
  b.lastRefill = now;

  if (b.tokens < 1) {
    buckets.set(key, b);
    throw new RateLimitError("AI rate limit exceeded — please slow down");
  }

  b.tokens -= 1;
  buckets.set(key, b);
}
