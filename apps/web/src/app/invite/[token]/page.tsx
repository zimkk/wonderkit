import { db } from "@kit/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export const metadata = { title: "Accept invitation · WonderKit" };

export default async function AcceptInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await auth();

  const invitation = await db.invitation.findUnique({
    where: { token },
    include: { org: true },
  });

  if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <h1 className="text-xl font-semibold">Invalid or expired invitation</h1>
          <p className="text-sm text-gray-500">This link has already been used or has expired.</p>
          <a href="/app" className="text-sm text-blue-600 underline">Go to dashboard</a>
        </div>
      </div>
    );
  }

  // If not signed in, redirect to login with invite token in cookie/param
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/invite/${token}`);
  }

  // Check they're signing in with the right email
  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (user?.email !== invitation.email) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3 max-w-sm">
          <h1 className="text-xl font-semibold">Wrong account</h1>
          <p className="text-sm text-gray-500">
            This invitation was sent to <strong>{invitation.email}</strong>.
            You are signed in as <strong>{user?.email}</strong>.
          </p>
          <a href="/login" className="text-sm text-blue-600 underline">Sign in with the correct email</a>
        </div>
      </div>
    );
  }

  // Accept: create membership, mark invitation as accepted
  const existing = await db.membership.findUnique({
    where: { userId_orgId: { userId: session.user.id, orgId: invitation.orgId } },
  });

  if (!existing) {
    await db.membership.create({
      data: { userId: session.user.id, orgId: invitation.orgId, role: invitation.role },
    });
  }

  await db.invitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date() } });

  redirect("/app");
}
