import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { authProviders } from "@/env";
import { Button } from "@kit/ui";

/** Sign-in page. OAuth buttons render only when their env keys exist (feature-detect, §5). */
export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/app");

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="mb-1 text-xl font-semibold">Sign in to WonderKit</h1>
        <p className="mb-6 text-sm text-zinc-500">
          We&apos;ll email you a magic link. No password needed.
        </p>

        <form
          action={async (formData) => {
            "use server";
            await signIn("resend", {
              email: formData.get("email"),
              redirectTo: "/app",
            });
          }}
          className="flex flex-col gap-3"
        >
          <input
            type="email"
            name="email"
            required
            placeholder="you@company.com"
            className="h-9 rounded-md border border-zinc-300 bg-transparent px-3 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700"
          />
          <Button type="submit">Send magic link</Button>
        </form>

        {(authProviders.google || authProviders.github) && (
          <>
            <div className="my-5 flex items-center gap-3 text-xs text-zinc-400">
              <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
              or
              <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
            </div>
            <div className="flex flex-col gap-2">
              {authProviders.google && (
                <form
                  action={async () => {
                    "use server";
                    await signIn("google", { redirectTo: "/app" });
                  }}
                >
                  <Button variant="outline" type="submit" className="w-full">
                    Continue with Google
                  </Button>
                </form>
              )}
              {authProviders.github && (
                <form
                  action={async () => {
                    "use server";
                    await signIn("github", { redirectTo: "/app" });
                  }}
                >
                  <Button variant="outline" type="submit" className="w-full">
                    Continue with GitHub
                  </Button>
                </form>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
