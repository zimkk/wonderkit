import { auth } from "@/auth";
import { db, requireOrgRole } from "@kit/db";
import { defaultProvider, costUsd } from "@kit/ai";
import { getActiveOrg } from "@/lib/org";
import type { Message } from "@kit/ai";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<Response> {
  const session = await auth();
  const { orgId } = await getActiveOrg();
  await requireOrgRole(session, orgId, "MEMBER");
  // Chat is available on all plans — no gate() needed here

  const { messages } = (await req.json()) as { messages: Message[] };
  const provider = defaultProvider();

  const encoder = new TextEncoder();
  let fullContent = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of provider.stream(messages)) {
          fullContent += chunk.delta;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: chunk.delta })}\n\n`));
          if (chunk.done) break;
        }

        const inputChars = messages.reduce((s, m) => s + m.content.length, 0);
        const inputTokens = Math.round(inputChars / 4);
        const outputTokens = Math.round(fullContent.length / 4);
        const usd = costUsd(provider.defaultModel, inputTokens, outputTokens);

        await db.usageEvent.create({
          data: {
            orgId,
            feature: "chat",
            provider: provider.id,
            model: provider.defaultModel,
            inputTokens,
            outputTokens,
            costUsd: usd,
          },
        });

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
