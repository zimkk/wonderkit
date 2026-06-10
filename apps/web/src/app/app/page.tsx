import { getActiveOrg } from "@/lib/org";
import { db } from "@kit/db";
import { Card, CardContent, CardHeader, CardTitle } from "@kit/ui";
import { UsageChart } from "@/components/usage-chart";

export default async function DashboardPage() {
  const { orgId, orgName } = await getActiveOrg();

  const [subscription, recentUsage, agentRuns] = await Promise.all([
    db.subscription.findUnique({ where: { orgId } }),
    db.usageEvent.aggregate({
      where: {
        orgId,
        createdAt: { gte: new Date(Date.now() - 30 * 86_400_000) },
      },
      _sum: { inputTokens: true, outputTokens: true, costUsd: true },
    }),
    db.agentRun.count({ where: { orgId } }),
  ]);

  const totalTokens =
    (recentUsage._sum.inputTokens ?? 0) + (recentUsage._sum.outputTokens ?? 0);
  const totalCost = Number(recentUsage._sum.costUsd ?? 0).toFixed(4);

  const rollups = await db.usageDailyRollup.findMany({
    where: { orgId, date: { gte: new Date(Date.now() - 14 * 86_400_000) } },
    orderBy: { date: "asc" },
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">{orgName}</h1>
        <p className="text-sm text-zinc-500">
          Plan: <span className="font-medium">{subscription?.plan ?? "FREE"}</span>
        </p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Tokens (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalTokens.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cost (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${totalCost}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Agent runs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{agentRuns}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Token usage (14 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <UsageChart data={rollups} />
        </CardContent>
      </Card>
    </div>
  );
}
