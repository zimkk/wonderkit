import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 px-6 text-center">
      <span className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-500 dark:border-zinc-700">
        Open source · v0.1
      </span>
      <h1 className="text-5xl font-bold tracking-tight">
        Ship AI SaaS in days,{" "}
        <span className="text-brand-600">not months</span>
      </h1>
      <p className="max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
        WonderKit is the open-source foundation for agent-native SaaS — multi-tenant auth,
        Stripe billing, provider-agnostic AI layer, and a multi-agent runtime, all wired up
        so Claude Code can extend it without human rescue.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/login"
          className="rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Get started free
        </Link>
        <a
          href="https://github.com/zimkk/wonderkit"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md border border-zinc-300 px-5 py-2.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          View on GitHub
        </a>
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-6 text-sm text-zinc-500">
        {["Multi-tenant orgs", "Stripe billing", "Claude / OpenAI / Ollama", "Multi-agent runtime", "VPS + Vercel deploy"].map((f) => (
          <span key={f} className="flex items-center gap-1.5">
            <span className="text-brand-500">✓</span> {f}
          </span>
        ))}
      </div>
    </main>
  );
}
