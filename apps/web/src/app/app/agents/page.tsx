import { db, requireOrgRole, gate } from "@kit/db";
import { auth } from "@/auth";
import { getActiveOrg } from "@/lib/org";
import { listAgents } from "@kit/agents";
import Link from "next/link";

export const metadata = { title: "Agents · WonderKit" };

export default async function AgentsPage() {
  const session = await auth();
  const { orgId } = await getActiveOrg();
  await requireOrgRole(session, orgId, "MEMBER");

  let gated = false;
  try {
    await gate(orgId, "agents");
  } catch {
    gated = true;
  }

  const runs = await db.agentRun.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, agent: true, status: true, createdAt: true },
  });

  const agents = listAgents();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Agents</h1>
        <p className="text-sm text-gray-500 mt-1">Multi-agent orchestration (Pro plan).</p>
      </div>

      {gated && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          Multi-agent runs require the <strong>Pro</strong> plan.{" "}
          <Link href="/app/settings/billing" className="underline">Upgrade →</Link>
        </div>
      )}

      <div>
        <h2 className="text-base font-medium mb-3">Available agents</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {agents.map((a) => (
            <div key={a.id} className="rounded-lg border p-4">
              <p className="font-medium">{a.name}</p>
              <p className="text-sm text-gray-500 mt-1">{a.description}</p>
              <p className="text-xs text-gray-400 mt-2">Max steps: {a.maxSteps}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-base font-medium mb-3">Recent runs</h2>
        {runs.length === 0 ? (
          <p className="text-sm text-gray-400">No agent runs yet.</p>
        ) : (
          <div className="rounded-lg border divide-y">
            {runs.map((r) => (
              <div key={r.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">{r.agent}</span>
                  <span className="ml-2 text-xs text-gray-400">{r.id.slice(0, 8)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    r.status === "SUCCEEDED" ? "bg-green-100 text-green-700" :
                    r.status === "FAILED" ? "bg-red-100 text-red-700" :
                    r.status === "RUNNING" ? "bg-yellow-100 text-yellow-700" :
                    "bg-gray-100 text-gray-500"
                  }`}>{r.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
