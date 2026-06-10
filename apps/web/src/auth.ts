// Auth.js v5 configuration (§5). Database sessions via Prisma adapter.
// Providers feature-detect from env — the app boots with any subset configured.

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@kit/db";
import { customAlphabet } from "nanoid";
import { env, authProviders } from "@/env";

const slugSuffix = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 6);

const providers = [
  // Magic link. With RESEND_API_KEY: real email. Without: dev console transport —
  // the sign-in URL is printed to the server log so the kit develops keyless.
  Resend({
    apiKey: env.RESEND_API_KEY ?? "dev-keyless",
    from: env.EMAIL_FROM,
    ...(env.RESEND_API_KEY
      ? {}
      : {
          async sendVerificationRequest({ identifier, url }) {
            console.log(`\n[dev email] Magic link for ${identifier}:\n${url}\n`);
          },
        }),
  }),
  ...(authProviders.google
    ? [Google({ clientId: env.AUTH_GOOGLE_ID, clientSecret: env.AUTH_GOOGLE_SECRET })]
    : []),
  ...(authProviders.github
    ? [GitHub({ clientId: env.AUTH_GITHUB_ID, clientSecret: env.AUTH_GITHUB_SECRET })]
    : []),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "database" },
  secret: env.AUTH_SECRET,
  pages: { signIn: "/login", verifyRequest: "/login/check-email" },
  providers,
  events: {
    // First login auto-creates a personal Organization + OWNER membership (§5).
    async createUser({ user }) {
      if (!user.id || !user.email) return;
      const localPart = user.email.split("@")[0]!.toLowerCase().replace(/[^a-z0-9-]/g, "-");
      await db.organization.create({
        data: {
          name: user.name ?? localPart,
          slug: `${localPart}-${slugSuffix()}`,
          memberships: { create: { userId: user.id, role: "OWNER" } },
          subscription: {
            create: { stripeCustomerId: `pending_${user.id}`, plan: "FREE", status: "ACTIVE" },
          },
        },
      });
    },
  },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});
