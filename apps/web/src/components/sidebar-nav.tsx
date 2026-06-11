"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@kit/ui";

const links = [
  { href: "/app", label: "Overview", exact: true },
  { href: "/app/chat", label: "Chat" },
  { href: "/app/agents", label: "Agents" },
  { href: "/app/settings/billing", label: "Billing" },
  { href: "/app/settings/team", label: "Team" },
  { href: "/app/settings/api-keys", label: "API Keys" },
  { href: "/app/settings", label: "Settings", exact: true },
];

const adminLinks = [{ href: "/admin", label: "Admin panel" }];

/** Primary sidebar navigation. Admin links visible only to superAdmins. */
export function SidebarNav({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <nav className="flex flex-col gap-0.5">
      {links.map(({ href, label, exact }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "rounded-md px-3 py-2 text-sm transition-colors",
            isActive(href, exact)
              ? "bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
              : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800",
          )}
        >
          {label}
        </Link>
      ))}

      {isSuperAdmin && (
        <>
          <div className="my-2 h-px bg-zinc-200 dark:bg-zinc-800" />
          {adminLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "rounded-md px-3 py-2 text-sm transition-colors",
                isActive(href)
                  ? "bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800",
              )}
            >
              {label}
            </Link>
          ))}
        </>
      )}
    </nav>
  );
}
