// Typed error classes (repo convention §17). Route handlers map these via toResponse();
// the UI error boundary maps PlanLimitError to the upgrade modal.

/** Base class for kit errors that carry an HTTP status. */
export class KitError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/** Thrown when a user lacks the required org role. Use via requireOrgRole, never inline. */
export class AuthzError extends KitError {
  constructor(message = "Forbidden") {
    super(message, 403);
  }
}

/** Thrown when an org exceeds its plan quota or hits a gated feature. UI renders upgrade modal. */
export class PlanLimitError extends KitError {
  constructor(
    message: string,
    public readonly upgradeUrl: string = "/app/settings/billing",
  ) {
    super(message, 402);
  }
}

/** Thrown when a rate-limit bucket is exhausted. Carries Retry-After seconds. */
export class RateLimitError extends KitError {
  constructor(
    message = "Rate limit exceeded",
    public readonly retryAfterSec: number = 60,
  ) {
    super(message, 429);
  }
}

/** Thrown when an upstream LLM/provider call fails after retries. */
export class ProviderError extends KitError {
  constructor(
    message: string,
    public readonly provider?: string,
  ) {
    super(message, 502);
  }
}

/** Maps a thrown error to a Response for route handlers. Use in every catch block at the API boundary. */
export function toResponse(err: unknown): Response {
  if (err instanceof RateLimitError) {
    return Response.json(
      { error: err.message },
      { status: err.status, headers: { "Retry-After": String(err.retryAfterSec) } },
    );
  }
  if (err instanceof PlanLimitError) {
    return Response.json({ error: err.message, upgradeUrl: err.upgradeUrl }, { status: err.status });
  }
  if (err instanceof KitError) {
    return Response.json({ error: err.message }, { status: err.status });
  }
  console.error("Unhandled error in route handler:", err);
  return Response.json({ error: "Internal server error" }, { status: 500 });
}
