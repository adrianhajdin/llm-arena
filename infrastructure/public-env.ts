/**
 * The only place in the app that reads `NEXT_PUBLIC_` variables.
 *
 * These cannot come from `serverEnv()`: that module is `server-only`, and Next
 * inlines browser variables into the bundle by matching literal
 * `process.env.NEXT_PUBLIC_X` property accesses at build time, so the read has
 * to be written out in full, once, somewhere a client component can import.
 *
 * They are typed as possibly missing on purpose. The server schema in `./env`
 * already fails the boot loudly when one is absent, so the only situation that
 * reaches this module empty is a build with no environment at all, which must
 * still produce a page rather than crash.
 */
export const publicEnv = Object.freeze({
  posthogKey: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  posthogHost: process.env.NEXT_PUBLIC_POSTHOG_HOST,
}) satisfies Readonly<Record<string, string | undefined>>;
