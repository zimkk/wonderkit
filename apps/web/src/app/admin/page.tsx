import { auth } from "@/auth";
import { db } from "@kit/db";
import { redirect } from "next/navigation";
import Link from "next/link";

export const metadata = { title: "Admin · WonderKit" };

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user?.isSuperAdmin) redirect("/app");

  const [orgCount, userCount, eventCount, runCount] = await Promise.all([
    db.organization.count(),
    db.user.count(),
    db.usageEvent.count(),
    db.agentRun.count(),
  ]);

  const recentOrgs = await db.organization.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      subscription: { select: { plan: true, status: true } },
      _count: { select: { memberships: true } },
    },
  });

  const recentRuns = await db.agentRun.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, orgId: true, agent: true, status: true, createdAt: true, costUsd: true },
  });

  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold">Admin panel</h1>
        <p className="text-sm text-gray-500 mt-1">Superadmin view — internal only.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Organisations", value: orgCount },
          { label: "Users", value: userCount },
          { label: "Usage events", value: eventCount.toLocaleString() },
          { label: "Agent runs", value: runCount.toLocaleString() },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border p-4">
            <p className="text-xs text-gray-500">{stat.label}</p>
            <p className="text-2xl font-semibold mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-base font-medium mb-3">Recent organisations</h2>
        <div className="rounded-lg border divide-y text-sm">
          {recentOrgs.map((org) => (
            <div key={org.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <span className="font-medium">{org.name}</span>
                <span className="ml-2 text-gray-400 text-xs">{org.slug}</span>
              </div>
              <div className="flex items-center gap-4 text-gray-500 text-xs">
                <span>{org._count.memberships} members</span>
                <span className="px-2 py-0.5 rounded-full bg-gray-100">{org.subscription?.plan ?? "FREE"}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-base font-medium mb-3">Recent agent runs</h2>
        <div className="rounded-lg border divide-y text-sm">
          {recentRuns.map((run) => (
            <div key={run.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <span className="font-medium">{run.agent}</span>
                <span className="ml-2 text-gray-400 text-xs">{run.orgId.slice(0, 8)}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className={`px-2 py-0.5 rounded-full ${
                  run.status === "SUCCEEDED" ? "bg-green-100 text-green-700" :
                  run.status === "FAILED" ? "bg-red-100 text-red-700" :
                  "bg-gray-100"
                }`}>{run.status}</span>
                {run.costUsd !== null && <span>${Number(run.costUsd).toFixed(4)}</span>}
              </div>
            </div>
          ))}
          {recentRuns.length === 0 && (
            <p className="px-4 py-3 text-gray-400">No agent runs yet.</p>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-400">
        <Link href="/app" className="underline">Back to dashboard</Link>
      </p>
    </div>
  );
}
