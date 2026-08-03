import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";

import type { ResponseState, TurnState } from "@/features/arena/turn-state";
import { ArenaScreen } from "@/features/arena/arena-screen";
import { castVoteAction } from "@/features/voting/cast-vote-action";
import { database } from "@/infrastructure/database";
import { findAppUserId } from "@/infrastructure/current-user";
import { fetchFreeModelCatalog } from "@/infrastructure/fetch-model-catalog";
import { defaultModelSelection } from "@/infrastructure/model-catalog";

/**
 * A saved thread, and the URL feature 8 shares. Anyone can open this link and
 * see the thread, signed in or not: `notFound()` is the only gate, and it
 * fires the same way for a made-up id, a deleted thread, or someone else's
 * thread, since a thread that exists is never a secret. Only the owner can
 * actually use it, which `isOwner` below carries down to the screen so the
 * composer and the vote buttons only ever render for them; `startTurn` and
 * `castVote` already refuse anyone else server-side, this is just the UI
 * agreeing with that up front rather than letting a visitor try and fail.
 *
 * A thread's models are fixed at turn one (docs/scope.md, feature 6), read
 * back here from its own first turn rather than the catalog's default trio.
 */
export default async function ThreadPage({
  params,
}: {
  readonly params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;
  const catalog = await fetchFreeModelCatalog();

  const thread = await database().thread.findUnique({
    where: { id: threadId },
    select: {
      id: true,
      userId: true,
      turns: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          prompt: true,
          vote: { select: { modelResponseId: true } },
          responses: {
            select: {
              id: true,
              modelId: true,
              modelName: true,
              status: true,
              text: true,
              timeToFirstTokenMs: true,
              tokensPerSecond: true,
              inputTokens: true,
              outputTokens: true,
              totalTokens: true,
              costUsd: true,
            },
          },
        },
      },
    },
  });

  if (!thread) notFound();

  const { userId: clerkId } = await auth();
  const viewerId = clerkId ? await findAppUserId(clerkId) : null;
  const isOwner = viewerId !== null && viewerId === thread.userId;

  const initialTurns: readonly TurnState[] = thread.turns.map((turn) => ({
    id: turn.id,
    prompt: turn.prompt,
    responses: turn.responses.map((response): ResponseState => ({
      id: response.id,
      modelId: response.modelId,
      modelName: response.modelName,
      status: response.status,
      text: response.text,
      won: turn.vote?.modelResponseId === response.id,
      metrics:
        response.status === "COMPLETE"
          ? {
              modelId: response.modelId,
              timeToFirstTokenMs: response.timeToFirstTokenMs,
              tokensPerSecond: response.tokensPerSecond
                ? Number(response.tokensPerSecond)
                : null,
              inputTokens: response.inputTokens,
              outputTokens: response.outputTokens,
              totalTokens: response.totalTokens,
              costUsd: Number(response.costUsd),
            }
          : null,
    })),
  }));

  /**
   * The composer opens on the models this thread's *most recent* turn ran, so a
   * follow-up repeats the same cast unless you change it. The first turn's set
   * would be the wrong default the moment someone has already swapped a model,
   * which they may now do on any turn (docs/scope.md, feature 6 as amended).
   *
   * Falls back to the catalog's default trio only for a thread with no turns,
   * which the composer would otherwise have nothing to open with.
   */
  const latestTurnModels = initialTurns.at(-1)?.responses.map((r) => r.modelId) ?? [];

  return (
    <ArenaScreen
      catalog={catalog}
      defaultSelection={
        latestTurnModels.length > 0
          ? latestTurnModels
          : catalog
            ? defaultModelSelection(catalog)
            : []
      }
      onCastVote={castVoteAction}
      threadId={thread.id}
      initialTurns={initialTurns}
      isOwner={isOwner}
    />
  );
}
