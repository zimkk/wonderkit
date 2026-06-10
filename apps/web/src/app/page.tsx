import Link from "next/link";

/** Public marketing landing page. Real copy lands in Phase 6; structure is final. */
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 px-6 text-center">
      <span className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-500 dark:border-zinc-700">
        v0.1 — Phase 1 scaffold
      </span>
      <h1 className="text-5xl font-bold tracking-tight">
        The agent-native <span className="text-brand-600">AI SaaS</span> kit
      </h1>
      <p className="max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
        Multi-tenant auth, metered billing, provider-agnostic AI layer, and a multi-agent runtime —
        built so coding agents can extend it without human rescue.
      </p>
      <div className="flex gap-3">
        <Link
          href="/login"
          className="rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Sign in
        </Link>
        <Link
          href="/app"
          className="rounded-md border border-zinc-300 px-5 py-2.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Open dashboard
        </Link>
      </div>
    </main>
  );
}
