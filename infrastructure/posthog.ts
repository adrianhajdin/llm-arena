import "server-only";

import { PostHog } from "posthog-node";

import { serverEnv } from "./env";

/**
 * The server-side PostHog client, built on first use.
 *
 * Lazy for the same reason the Prisma, Arcjet, and OpenRouter clients are:
 * `next build` evaluates route modules to collect page data, and a build
 * should not demand real PostHog keys. This is a distinct client from the
 * browser one in `features/analytics/posthog-provider.tsx` — this one exists
 * to fire funnel events from server code and to wrap real model calls with
 * `@posthog/ai`, neither of which the browser client can do.
 */
let cached: PostHog | null = null;

export const posthogServer = (): PostHog =>
  (cached ??= new PostHog(serverEnv().NEXT_PUBLIC_POSTHOG_KEY, {
    host: serverEnv().NEXT_PUBLIC_POSTHOG_HOST,
  }));
