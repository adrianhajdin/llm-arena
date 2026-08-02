import "server-only";

import { detectBot, tokenBucket } from "@arcjet/next";

import { arcjetClient } from "@/infrastructure/arcjet";

/**
 * Everything Arcjet checks before a prompt is allowed to reach a model.
 *
 * The browser sends one request per selected model, so a three-model turn is
 * three calls landing here at once. The token bucket is keyed on the signed-in
 * user rather than the endpoint, which is what makes the limit a limit on a
 * person's total usage across all three models instead of a per-model
 * allowance that triples the moment someone picks a third model.
 *
 * Bots are denied outright. This endpoint is only ever called by our own
 * browser code, no crawler or monitor has a reason to reach it, and every
 * request it lets through spends real inference on someone else's account.
 *
 * Prompt injection detection is deliberately absent, and that is a correction
 * to the original plan rather than an oversight. Arcjet bills prompt scanning
 * as a usage-based add-on instead of including it in a plan, and on an account
 * without it the rule does not fail quietly: the server answers "Unable to
 * detect prompt injection", the whole decision comes back ERROR, and every
 * prompt pays a round trip for protection it never receives. Re-enabling it is
 * two lines once the add-on is on the account: add
 * `.withRule(detectPromptInjection({ mode: "LIVE" }))` below, and pass
 * `detectPromptInjectionMessage` with the newest user message at protect time.
 * Scan the newest turn only, not the whole transcript, since earlier turns
 * already passed this check on the request that carried them.
 */
const REFILL_RATE = 15;
const INTERVAL_SECONDS = 60;
const CAPACITY = 30;

/** One model answering one prompt, the unit a turn is billed in. */
const TOKENS_PER_CALL = 1;

let cached: ReturnType<typeof createProtectedClient> | null = null;

const createProtectedClient = () =>
  arcjetClient()
    .withRule(detectBot({ mode: "LIVE", allow: [] }))
    .withRule(
      tokenBucket({
        mode: "LIVE",
        characteristics: ["userId"],
        refillRate: REFILL_RATE,
        interval: INTERVAL_SECONDS,
        capacity: CAPACITY,
      }),
    );

const protectedClient = () => (cached ??= createProtectedClient());

const secondsUntil = (resetTime: Date | undefined): number =>
  resetTime
    ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000))
    : INTERVAL_SECONDS;

const denial = (message: string, status: number, headers?: HeadersInit): Response =>
  Response.json({ error: message }, { status, headers });

/**
 * Runs the rules for one chat call.
 *
 * Returns `null` when the request may proceed, or the response to send back
 * when it may not. Never surfaces an Arcjet reason verbatim: the caller gets a
 * plain sentence that says what happened and what to do about it.
 */
export const guardChatRequest = async (
  request: Request,
  userId: string,
): Promise<Response | null> => {
  const decision = await protectedClient().protect(request, {
    userId,
    requested: TOKENS_PER_CALL,
  });

  if (decision.isErrored()) {
    console.error("[chat] arcjet could not reach a decision", decision.reason.message);

    return null;
  }

  if (!decision.isDenied()) {
    return null;
  }

  if (decision.reason.isRateLimit()) {
    const retryAfter = secondsUntil(decision.reason.resetTime);

    return denial(
      `You've sent a lot of prompts in a short time. Try again in ${retryAfter} seconds.`,
      429,
      { "retry-after": String(retryAfter) },
    );
  }

  return denial("This request was blocked. If you think that's wrong, try again.", 403);
};
