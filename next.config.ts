import type { NextConfig } from "next";

/**
 * Proxies PostHog ingestion through this app's own origin so browser requests
 * read as first-party traffic instead of a third-party script an ad blocker
 * strips. Reads `process.env` directly rather than through `publicEnv`
 * because this file runs outside Next and cannot import a `server-only`
 * module, the same exemption `docs/coding-standards.md` already grants other
 * `*.config.ts` files.
 */
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
const posthogAssetHost = posthogHost.replace(
  /^https:\/\/([a-z]+)\./,
  "https://$1-assets.",
);

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: `${posthogAssetHost}/static/:path*`,
      },
      {
        source: "/ingest/:path*",
        destination: `${posthogHost}/:path*`,
      },
      {
        source: "/ingest/decide",
        destination: `${posthogHost}/decide`,
      },
    ];
  },
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
