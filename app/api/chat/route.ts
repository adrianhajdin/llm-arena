import { auth } from "@clerk/nextjs/server";

import { chatRequestSchema } from "@/features/chat/chat-request";
import { guardChatRequest } from "@/features/chat/chat-protection";
import { streamModelResponse } from "@/features/chat/stream-model-response";
import { database } from "@/infrastructure/database";
import { findAppUserId } from "@/infrastructure/current-user";
import { fetchFreeModelCatalog } from "@/infrastructure/fetch-model-catalog";

/**
 * One model per request, on purpose.
 *
 * The browser sends one of these per selected model, in parallel, so each
 * answer streams and fails on its own connection.
 *
 * Sign-in is required before anything else runs. The rate limit is a limit on
 * a person, not on an endpoint, and without a Clerk user there is no honest
 * identity to key it on. Rejecting here also means an unauthenticated request
 * never costs an Arcjet decision.
 */
export const POST = async (request: Request): Promise<Response> => {
  const { userId } = await auth();

  if (!userId) {
    return Response.json(
      { error: "Sign in to send a prompt to the arena." },
      { status: 401 },
    );
  }

  const blocked = await guardChatRequest(request, userId);

  if (blocked) {
    return blocked;
  }

  const payload = await request.json().catch(() => null);
  const parsed = chatRequestSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json(
      { error: "That request didn't look right. Try sending your prompt again." },
      { status: 400 },
    );
  }

  // The schema only proves this is a plausible model id. Every model this app
  // offers is free tier, so anything off that list is either a mistake or a
  // hand-crafted request trying to spend real money against our key.
  //
  // It fails closed. A catalog we cannot read is not permission to call a
  // model we cannot price, and the arena is unusable without the list anyway.
  const catalog = await fetchFreeModelCatalog();

  if (!catalog) {
    return Response.json(
      { error: "We can't reach the model list right now. Try again in a moment." },
      { status: 503 },
    );
  }

  if (!catalog.some((model) => model.id === parsed.data.modelId)) {
    return Response.json(
      { error: "That model isn't one of the free models the arena runs." },
      { status: 400 },
    );
  }

  // The turn and its response row already exist, created by `startTurn` before
  // any model is ever called. This confirms the caller actually owns the turn
  // they are asking this model to answer, rather than trusting a `turnId` a
  // signed-in stranger could otherwise send for someone else's thread.
  const target = await database().modelResponse.findUnique({
    where: {
      turnId_modelId: { turnId: parsed.data.turnId, modelId: parsed.data.modelId },
    },
    select: { turn: { select: { thread: { select: { userId: true } } } } },
  });

  if (!target) {
    return Response.json(
      { error: "That turn hasn't been started for this model." },
      { status: 400 },
    );
  }

  const appUserId = await findAppUserId(userId);

  if (!appUserId || target.turn.thread.userId !== appUserId) {
    return Response.json({ error: "That turn isn't yours to answer." }, { status: 403 });
  }

  try {
    return streamModelResponse(parsed.data, { clerkId: userId });
  } catch (error) {
    console.error("[chat] failed to start the model stream", error);

    return Response.json(
      { error: "We couldn't reach that model just now. Give it another try." },
      { status: 502 },
    );
  }
};
