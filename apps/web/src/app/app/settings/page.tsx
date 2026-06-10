import { getActiveOrg } from "@/lib/org";

/** Org settings placeholder. Billing tab built in Phase 2; full settings in Phase 3. */
export default async function SettingsPage() {
  const { orgName, orgSlug, role } = await getActiveOrg();
  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-semibold">Settings</h1>
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm">
          <span className="text-zinc-500">Organization:</span>{" "}
          <span className="font-medium">{orgName}</span>
        </p>
        <p className="mt-2 text-sm">
          <span className="text-zinc-500">Slug:</span>{" "}
          <span className="font-mono text-xs">{orgSlug}</span>
        </p>
        <p className="mt-2 text-sm">
          <span className="text-zinc-500">Your role:</span>{" "}
          <span className="font-medium">{role}</span>
        </p>
        <p className="mt-4 text-xs text-zinc-400">Billing, members, and API keys — Phase 2.</p>
      </div>
    </div>
  );
}
