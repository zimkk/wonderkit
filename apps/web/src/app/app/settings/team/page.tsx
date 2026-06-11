import { db, requireOrgRole } from "@kit/db";
import { auth } from "@/auth";
import { getActiveOrg } from "@/lib/org";
import { inviteMember, removeMember, cancelInvitation } from "@/lib/invitations";

export const metadata = { title: "Team · WonderKit" };

export default async function TeamPage() {
  const session = await auth();
  const { orgId } = await getActiveOrg();
  const membership = await requireOrgRole(session, orgId, "MEMBER");
  const canManage = membership.role === "OWNER" || membership.role === "ADMIN";

  const [members, pendingInvites] = await Promise.all([
    db.membership.findMany({
      where: { orgId },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
      orderBy: { user: { email: "asc" } },
    }),
    db.invitation.findMany({
      where: { orgId, acceptedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Team</h1>
        <p className="text-sm text-gray-500 mt-1">Manage members and invitations.</p>
      </div>

      {/* Members */}
      <div>
        <h2 className="text-base font-medium mb-3">Members ({members.length})</h2>
        <div className="rounded-lg border divide-y text-sm">
          {members.map((m) => (
            <div key={m.userId} className="px-4 py-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium truncate">{m.user.name ?? m.user.email}</p>
                {m.user.name && <p className="text-gray-400 text-xs truncate">{m.user.email}</p>}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{m.role}</span>
                {canManage && m.role !== "OWNER" && (
                  <form action={async () => { "use server"; await removeMember(orgId, m.userId); }}>
                    <button type="submit" className="text-xs text-red-500 hover:text-red-700">Remove</button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending invitations */}
      {pendingInvites.length > 0 && (
        <div>
          <h2 className="text-base font-medium mb-3">Pending invitations</h2>
          <div className="rounded-lg border divide-y text-sm">
            {pendingInvites.map((inv) => (
              <div key={inv.id} className="px-4 py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{inv.email}</p>
                  <p className="text-xs text-gray-400">
                    Expires {inv.expiresAt.toLocaleDateString()} · {inv.role}
                  </p>
                </div>
                {canManage && (
                  <form action={async () => { "use server"; await cancelInvitation(orgId, inv.id); }}>
                    <button type="submit" className="text-xs text-gray-400 hover:text-gray-700">Cancel</button>
                  </form>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite form */}
      {canManage && (
        <div>
          <h2 className="text-base font-medium mb-3">Invite a member</h2>
          <form
            className="flex gap-3 flex-wrap"
            action={async (fd: FormData) => {
              "use server";
              const email = fd.get("email") as string;
              const role = fd.get("role") as "ADMIN" | "MEMBER";
              await inviteMember(orgId, email, role);
            }}
          >
            <input
              name="email"
              type="email"
              required
              placeholder="colleague@example.com"
              className="flex-1 min-w-48 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              name="role"
              defaultValue="MEMBER"
              className="rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Send invite
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
