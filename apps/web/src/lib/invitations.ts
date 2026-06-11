"use server";

import { nanoid } from "nanoid";
import { db, requireOrgRole, PLANS } from "@kit/db";
import { auth } from "@/auth";
import { sendEmail } from "@kit/emails";
import { env } from "@/env";
import { revalidatePath } from "next/cache";

export async function inviteMember(orgId: string, email: string, role: "ADMIN" | "MEMBER") {
  const session = await auth();
  const membership = await requireOrgRole(session, orgId, "ADMIN");

  // Enforce member limit for plan
  const sub = await db.subscription.findUnique({ where: { orgId } });
  const plan = sub?.plan ?? "FREE";
  const memberCount = await db.membership.count({ where: { orgId } });
  if (memberCount >= PLANS[plan].maxMembers) {
    throw new Error(`Member limit reached for ${PLANS[plan].label} plan. Upgrade to add more members.`);
  }

  // Idempotent — update if pending invite already exists
  const token = nanoid(32);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const existing = await db.invitation.findUnique({ where: { orgId_email: { orgId, email } } });
  if (existing?.acceptedAt) throw new Error("This user is already a member.");

  const invitation = await db.invitation.upsert({
    where: { orgId_email: { orgId, email } },
    update: { token, expiresAt, role },
    create: { orgId, email, role, token, expiresAt },
    include: { org: true },
  });

  const inviter = await db.user.findUnique({ where: { id: membership.userId } });
  const acceptUrl = `${env.AUTH_URL ?? "http://localhost:3000"}/invite/${token}`;

  await sendEmail(
    "InviteEmail",
    { inviterName: inviter?.name ?? inviter?.email ?? "A teammate", orgName: invitation.org.name, acceptUrl },
    email,
  );

  revalidatePath("/app/settings/team");
}

export async function removeMember(orgId: string, userId: string) {
  const session = await auth();
  await requireOrgRole(session, orgId, "OWNER");
  // Can't remove the owner themselves
  const target = await db.membership.findUnique({ where: { userId_orgId: { userId, orgId } } });
  if (target?.role === "OWNER") throw new Error("Cannot remove the org owner.");
  await db.membership.delete({ where: { userId_orgId: { userId, orgId } } });
  revalidatePath("/app/settings/team");
}

export async function cancelInvitation(orgId: string, invitationId: string) {
  const session = await auth();
  await requireOrgRole(session, orgId, "ADMIN");
  await db.invitation.delete({ where: { id: invitationId, orgId } });
  revalidatePath("/app/settings/team");
}
