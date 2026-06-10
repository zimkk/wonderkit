import { redirect } from "next/navigation";
import { getActiveOrg } from "@/lib/org";
import { SidebarNav } from "@/components/sidebar-nav";
import { OrgSwitcher } from "@/components/org-switcher";
import { UserMenu } from "@/components/user-menu";

/** Authed dashboard shell. All /app/* pages live inside this layout. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const activeOrg = await getActiveOrg();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 md:flex">
        <div className="flex h-14 items-center border-b border-zinc-200 px-4 dark:border-zinc-800">
          <OrgSwitcher activeOrg={activeOrg} />
        </div>
        <div className="flex flex-1 flex-col gap-1 p-3">
          <SidebarNav isSuperAdmin={activeOrg.isSuperAdmin} />
        </div>
        <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
          <UserMenu />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex flex-1 flex-col overflow-auto">{children}</main>
    </div>
  );
}
