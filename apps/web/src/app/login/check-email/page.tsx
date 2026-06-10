/** Shown after requesting a magic link. In keyless dev mode the link is in the server console. */
export default function CheckEmailPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-sm text-center">
        <h1 className="mb-2 text-xl font-semibold">Check your email</h1>
        <p className="text-sm text-zinc-500">
          We sent you a sign-in link. In local dev without a Resend key, the link is printed in the
          server console instead.
        </p>
      </div>
    </main>
  );
}
