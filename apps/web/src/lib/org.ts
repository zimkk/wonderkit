// Active-org resolution (§5). The dashboard shell sets an `activeOrgId` cookie via the org
// switcher; this helper validates it against real memberships and falls back to the first org.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@kit/db";
import { auth } from "@/auth";

export const ACTIVE_ORG_COOKIE = "activeOrgId";

export interface ActiveOrg {
  userId: string;
  orgId: string;
  orgName: string;
  orgSlug: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  isSuperAdmin: boolean;
}

/**
 * Use in authed layouts/pages to get the current user's active org context.
 * Redirects to /login when unauthenticated. Never trusts the cookie without a membership check.
 */
export async function getActiveOrg(): Promise<ActiveOrg> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const memberships = await db.membership.findMany({
    where: { userId: session.user.id },
    include: { org: true, user: { select: { isSuperAdmin: true } } },
    orderBy: { org: { createdAt: "asc" } },
  });
  if (memberships.length === 0) {
    // Defensive: createUser event should have made one. Recover instead of crashing.
    redirect("/login?error=no-org");
  }

  const cookieOrgId = (await cookies()).get(ACTIVE_ORG_COOKIE)?.value;
  const active = memberships.find((m) => m.orgId === cookieOrgId) ?? memberships[0]!;

  return {
    userId: session.user.id,
    orgId: active.orgId,
    orgName: active.org.name,
    orgSlug: active.org.slug,
    role: active.role,
    isSuperAdmin: active.user.isSuperAdmin,
  };
}
