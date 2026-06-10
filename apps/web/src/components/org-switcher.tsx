"use client";

import type { ActiveOrg } from "@/lib/org";

/** Org display + (future) switcher. For Phase 1 shows active org name; multi-org switching
 *  requires a server action + revalidation added in Phase 2 when invitations land. */
export function OrgSwitcher({ activeOrg }: { activeOrg: ActiveOrg }) {
  return (
    <button
      onClick={() => {
        // Placeholder: will open org-switcher modal once multi-org invite flow is built (§5).
        console.debug("org switcher — activeOrgId:", activeOrg.orgId);
      }}
      className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
    >
      <span className="flex h-6 w-6 items-center justify-center rounded bg-brand-600 text-xs font-bold text-white">
        {activeOrg.orgName[0]?.toUpperCase()}
      </span>
      <span className="truncate font-medium">{activeOrg.orgName}</span>
      <span className="ml-auto text-xs text-zinc-400">{activeOrg.role}</span>
    </button>
  );
}
