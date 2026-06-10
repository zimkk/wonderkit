// THE authorization pattern (§5). Every server action / route handler starts with
// requireOrgRole (session auth) or resolveApiKey (bearer auth). No inline role checks.

import { createHash } from "node:crypto";
import type { Membership, Role } from "@prisma/client";
import { db } from "./client";
import { AuthzError } from "./errors";

/** Minimal session shape authz needs — structurally compatible with Auth.js sessions. */
export interface SessionLike {
  user?: { id?: string | null } | null;
}

/** Role hierarchy for minimum-role checks: OWNER > ADMIN > MEMBER. */
const ROLE_RANK: Record<Role, number> = { OWNER: 3, ADMIN: 2, MEMBER: 1 };

/** Org-scoped auth context shared by session auth and API-key auth — downstream code is identical for both. */
export interface OrgContext {
  orgId: string;
  userId: string | null;
  role: Role;
}

/**
 * Use at the top of every server action / route handler that touches org data.
 * Verifies the session user has at least `min` role in `orgId`; throws AuthzError(403) otherwise.
 */
export async function requireOrgRole(
  session: SessionLike | null,
  orgId: string,
  min: Role,
): Promise<Membership> {
  const userId = session?.user?.id;
  if (!userId) throw new AuthzError("Not authenticated");
  const membership = await db.membership.findUnique({
    where: { userId_orgId: { userId, orgId } },
  });
  if (!membership) throw new AuthzError("Not a member of this organization");
  if (ROLE_RANK[membership.role] < ROLE_RANK[min]) {
    throw new AuthzError(`Requires ${min} role`);
  }
  return membership;
}

/** Hashes an API key for storage/lookup. Plaintext keys are never persisted. */
export function hashApiKey(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

/**
 * Use in route handlers that accept `Authorization: Bearer sk_live_...`.
 * Maps a presented API key to an OrgContext (role ADMIN, no user) or throws AuthzError.
 */
export async function resolveApiKey(authorizationHeader: string | null): Promise<OrgContext> {
  const token = authorizationHeader?.match(/^Bearer\s+(sk_[A-Za-z0-9_]+)$/)?.[1];
  if (!token) throw new AuthzError("Missing or malformed API key");
  const key = await db.apiKey.findUnique({ where: { hashedKey: hashApiKey(token) } });
  if (!key || key.revokedAt) throw new AuthzError("Invalid or revoked API key");
  // Fire-and-forget freshness marker; failure here must not fail the request.
  db.apiKey
    .update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
    .catch(() => undefined);
  return { orgId: key.orgId, userId: null, role: "ADMIN" };
}
