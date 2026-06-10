import { auth, signOut } from "@/auth";

/** Bottom-of-sidebar user identity + sign-out. Server component — reads session directly. */
export async function UserMenu() {
  const session = await auth();
  if (!session?.user) return null;

  return (
    <div className="flex items-center gap-2">
      {session.user.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={session.user.image}
          alt=""
          className="h-7 w-7 rounded-full object-cover"
        />
      ) : (
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold dark:bg-zinc-700">
          {session.user.name?.[0]?.toUpperCase() ?? session.user.email?.[0]?.toUpperCase()}
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-xs font-medium">{session.user.name ?? session.user.email}</span>
        {session.user.name && (
          <span className="truncate text-xs text-zinc-500">{session.user.email}</span>
        )}
      </div>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}
      >
        <button
          type="submit"
          className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
