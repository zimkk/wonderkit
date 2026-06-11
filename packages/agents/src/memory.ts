import { db } from "@kit/db";

export async function storeMemory(
  orgId: string,
  content: string,
  kind = "fact",
  agent?: string,
): Promise<void> {
  await db.memoryItem.create({
    data: { orgId, content, kind, agent },
  });
}

export async function retrieveMemories(
  orgId: string,
  _query: string,
  limit = 5,
): Promise<Array<{ content: string; kind: string; createdAt: Date }>> {
  const items = await db.memoryItem.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { content: true, kind: true, createdAt: true },
  });
  return items;
}
