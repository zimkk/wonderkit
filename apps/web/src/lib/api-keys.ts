"use server";

import { nanoid } from "nanoid";
import { db, requireOrgRole, hashApiKey } from "@kit/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

/** Create a new API key. Returns the plaintext key — shown once, never stored. */
export async function createApiKey(orgId: string, name: string): Promise<string> {
  const session = await auth();
  await requireOrgRole(session, orgId, "ADMIN");

  const plaintext = `sk_live_${nanoid(32)}`;
  await db.apiKey.create({
    data: { orgId, name, hashedKey: hashApiKey(plaintext) },
  });

  revalidatePath("/app/settings/api-keys");
  return plaintext;
}

/** Revoke (soft-delete) an API key. */
export async function revokeApiKey(orgId: string, keyId: string) {
  const session = await auth();
  await requireOrgRole(session, orgId, "ADMIN");
  await db.apiKey.update({
    where: { id: keyId, orgId },
    data: { revokedAt: new Date() },
  });
  revalidatePath("/app/settings/api-keys");
}
