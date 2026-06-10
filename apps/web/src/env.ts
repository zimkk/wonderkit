// Typed, validated env access (t3-env pattern). App code imports `env` from here —
// NEVER read process.env directly (golden rule; ESLint-enforced later).

import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    AUTH_SECRET: z.string().min(32, "Generate with: openssl rand -base64 32"),
    AUTH_URL: z.string().url().optional(),

    // OAuth providers — optional; login buttons feature-detect on these.
    AUTH_GOOGLE_ID: z.string().optional(),
    AUTH_GOOGLE_SECRET: z.string().optional(),
    AUTH_GITHUB_ID: z.string().optional(),
    AUTH_GITHUB_SECRET: z.string().optional(),

    // Email — optional in dev; console transport logs magic links when unset.
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().default("AI Kit <noreply@example.com>"),
  },
  client: {},
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_URL: process.env.AUTH_URL,
    AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
    AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
    AUTH_GITHUB_ID: process.env.AUTH_GITHUB_ID,
    AUTH_GITHUB_SECRET: process.env.AUTH_GITHUB_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
  },
  emptyStringAsUndefined: true,
  skipValidation: process.env.SKIP_ENV_VALIDATION === "1",
});

/** True when the provider's env keys are present — used to hide login buttons (§5). */
export const authProviders = {
  google: Boolean(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET),
  github: Boolean(env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET),
  /** Magic link is always available: real email with Resend key, console transport without. */
  magicLink: true,
};
