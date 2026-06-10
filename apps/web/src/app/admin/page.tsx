import { auth } from "@/auth";
import { db } from "@kit/db";
import { redirect } from "next/navigation";

/** Admin panel (§13). Only isSuperAdmin users reach this page — middleware enforces it. */
export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user?.isSuperAdmin) redirect("/app");

  const [orgCount, eventCount] = await Promise.all([
    db.organization.count(),
    db.usageEvent.count(),
  ]);

  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-semibold">Admin</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500">Organizations</p>
          <p className="text-2xl font-bold">{orgCount}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500">Usage events</p>
          <p className="text-2xl font-bold">{eventCount}</p>
        </div>
      </div>
      <p className="mt-6 text-xs text-zinc-400">Full admin panel — Phase 6.</p>
    </div>
  );
}
