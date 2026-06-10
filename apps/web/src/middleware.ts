// Route protection middleware. /app/* and /admin/* require an active session.
// Uses Auth.js v5 auth() helper — no JWT decoding here; session is DB-backed.

export { auth as middleware } from "@/auth";

export const config = {
  matcher: ["/app/:path*", "/admin/:path*"],
};
