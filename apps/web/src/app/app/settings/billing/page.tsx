import { db, requireOrgRole } from "@kit/db";
import { auth } from "@/auth";
import { getActiveOrg } from "@/lib/org";
import { services } from "@/env";
import { createCheckoutSession, createPortalSession } from "@/lib/billing";

export const metadata = { title: "Billing · WonderKit" };

export default async function BillingPage() {
  const session = await auth();
  const { orgId } = await getActiveOrg();
  await requireOrgRole(session, orgId, "OWNER");

  const subscription = await db.subscription.findUnique({ where: { orgId } });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Billing</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your plan and payment method.</p>
      </div>

      {!services.stripe && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Stripe is not configured — add <code>STRIPE_SECRET_KEY</code> and related env vars to enable billing.
        </div>
      )}

      <div className="rounded-lg border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Current plan</p>
            <p className="text-lg font-medium">{subscription?.plan ?? "FREE"}</p>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
            subscription?.status === "ACTIVE" ? "bg-green-100 text-green-800" :
            subscription?.status === "PAST_DUE" ? "bg-red-100 text-red-800" :
            "bg-gray-100 text-gray-600"
          }`}>
            {subscription?.status ?? "ACTIVE"}
          </span>
        </div>

        {services.stripe && (
          <div className="flex gap-3 flex-wrap pt-2">
            {(!subscription || subscription.plan === "FREE") && (
              <>
                <UpgradeButton orgId={orgId} plan="STARTER" label="Upgrade to Starter" />
                <UpgradeButton orgId={orgId} plan="PRO" label="Upgrade to Pro" />
              </>
            )}
            {subscription?.plan === "STARTER" && (
              <UpgradeButton orgId={orgId} plan="PRO" label="Upgrade to Pro" />
            )}
            {subscription?.stripeCustomerId && (
              <ManageButton orgId={orgId} customerId={subscription.stripeCustomerId} />
            )}
          </div>
        )}
      </div>

      <div className="rounded-lg border divide-y">
        {([
          { plan: "FREE", price: "$0/mo", features: ["100k tokens/mo", "1 agent", "Community support"] },
          { plan: "STARTER", price: "$29/mo", features: ["2M tokens/mo", "5 agents", "Email support"] },
          { plan: "PRO", price: "$99/mo", features: ["20M tokens/mo", "Unlimited agents", "Priority support"] },
        ] as const).map((tier) => (
          <div key={tier.plan} className={`p-4 flex items-start justify-between ${subscription?.plan === tier.plan ? "bg-blue-50" : ""}`}>
            <div>
              <p className="font-medium">{tier.plan} — {tier.price}</p>
              <ul className="mt-1 text-sm text-gray-500 space-y-0.5">
                {tier.features.map((f) => <li key={f}>· {f}</li>)}
              </ul>
            </div>
            {subscription?.plan === tier.plan && (
              <span className="text-xs text-blue-600 font-medium">Current</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

async function UpgradeButton({ orgId, plan, label }: { orgId: string; plan: "STARTER" | "PRO"; label: string }) {
  async function action() {
    "use server";
    const url = await createCheckoutSession(orgId, plan);
    const { redirect } = await import("next/navigation");
    redirect(url);
  }
  return (
    <form action={action}>
      <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
        {label}
      </button>
    </form>
  );
}

async function ManageButton({ orgId, customerId }: { orgId: string; customerId: string }) {
  async function action() {
    "use server";
    const url = await createPortalSession(orgId, customerId);
    const { redirect } = await import("next/navigation");
    redirect(url);
  }
  return (
    <form action={action}>
      <button type="submit" className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50">
        Manage payment method
      </button>
    </form>
  );
}
