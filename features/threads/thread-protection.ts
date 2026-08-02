import "server-only";

import { detectBot, slidingWindow } from "@arcjet/next";

import { arcjetClient } from "@/infrastructure/arcjet";

/**
 * Everything Arcjet checks before a public thread page is allowed to render.
 *
 * `/t/[threadId]` has no auth gate by design (docs/scope.md, feature 8): a
 * thread's real owner and any anonymous visitor with the link both reach the
 * same page. With no signed-in user to key on, the rate limit falls back to
 * IP, the one identity Arcjet has here — weaker than chat's per-user bucket,
 * but the right backstop against a single link, or the whole route, being
 * hammered. The limit is deliberately generous: it exists to stop volumetric
 * abuse, never to make a real link fail to load for someone who was just
 * sent it.
 *
 * Bots are denied outright, same reasoning as chat: this page has no
 * legitimate crawler use case, and rich link previews are explicitly out of
 * scope (docs/scope.md).
 */
const WINDOW_INTERVAL = "60s";
const MAX_REQUESTS_PER_WINDOW = 60;

let cached: ReturnType<typeof createProtectedClient> | null = null;

const createProtectedClient = () =>
  arcjetClient()
    .withRule(detectBot({ mode: "LIVE", allow: [] }))
    .withRule(
      slidingWindow({
        mode: "LIVE",
        interval: WINDOW_INTERVAL,
        max: MAX_REQUESTS_PER_WINDOW,
      }),
    );

const protectedClient = () => (cached ??= createProtectedClient());

/**
 * Runs the rules for one `/t/[threadId]` request.
 *
 * Returns `null` when the request may proceed, or the response to send back
 * when it may not. Never surfaces an Arcjet reason verbatim: the caller gets
 * a plain sentence, the real one goes to the server log.
 */
export const guardThreadRequest = async (request: Request): Promise<Response | null> => {
  const decision = await protectedClient().protect(request);

  if (decision.isErrored()) {
    console.error("[thread] arcjet could not reach a decision", decision.reason.message);

    return null;
  }

  if (!decision.isDenied()) {
    return null;
  }

  if (decision.reason.isRateLimit()) {
    return new Response("Too many requests. Try again shortly.", { status: 429 });
  }

  return new Response("This request was blocked.", { status: 403 });
};
