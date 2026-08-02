import "server-only";

import { z } from "zod";

/**
 * Every server-side environment variable this app needs, in one place.
 *
 * Access goes through `serverEnv()` rather than a module-level constant. That
 * is not ceremony: `next build` evaluates route modules to collect page data,
 * so a constant parsed at import time would make a production build demand
 * real secrets. Reading lazily keeps the build honest while
 * `instrumentation.ts` still forces the check at server startup, so a missing
 * variable crashes on boot, named, instead of on someone's first prompt.
 */
const serverEnvSchema = z.object({
  OPENROUTER_API_KEY: z.string().min(1, "OPENROUTER_API_KEY is required"),
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine(
      (value) => value.startsWith("postgres://") || value.startsWith("postgresql://"),
      "DATABASE_URL must be a postgres:// or postgresql:// connection string",
    ),
  CLERK_SECRET_KEY: z.string().min(1, "CLERK_SECRET_KEY is required"),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required"),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().min(1, "NEXT_PUBLIC_POSTHOG_KEY is required"),
  NEXT_PUBLIC_POSTHOG_HOST: z.url("NEXT_PUBLIC_POSTHOG_HOST must be a full URL"),
  ARCJET_KEY: z
    .string()
    .min(1, "ARCJET_KEY is required")
    .startsWith("ajkey_", "ARCJET_KEY must be a site key starting with ajkey_"),
});

export type ServerEnv = Readonly<z.infer<typeof serverEnvSchema>>;

const formatIssues = (error: z.ZodError): string =>
  error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");

const parseServerEnv = (source: NodeJS.ProcessEnv): ServerEnv => {
  const result = serverEnvSchema.safeParse(source);

  if (!result.success) {
    throw new Error(
      `Invalid environment variables:\n${formatIssues(result.error)}\n\nCopy .env.example to .env.local and fill in the missing values.`,
    );
  }

  return Object.freeze(result.data);
};

let cached: ServerEnv | null = null;

/** Parses once, then hands back the same frozen object on every later call. */
export const serverEnv = (): ServerEnv => (cached ??= parseServerEnv(process.env));
