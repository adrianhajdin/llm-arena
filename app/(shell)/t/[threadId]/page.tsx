import { notFound } from "next/navigation";

import type { ResponseState, TurnState } from "@/features/arena/turn-state";
import { ArenaScreen } from "@/features/arena/arena-screen";
import { castVoteAction } from "@/features/voting/cast-vote-action";
import { database } from "@/infrastructure/database";
import { fetchFreeModelCatalog } from "@/infrastructure/fetch-model-catalog";
import { defaultModelSelection } from "@/infrastructure/model-catalog";

/**
 * A saved thread, and the URL feature 8 shares. Who is allowed to see it is
 * still feature 8's decision — this loads the thread's real turns regardless
 * of who is asking, which is the minimum feature 6 needs: a prompt sent from
 * the empty arena navigates here immediately, before any model has answered,
 * so this is also where those first `STREAMING` rows are actually seen for
 * the first time.
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

  const lockedModels =
    initialTurns[0]?.responses.map((response) => ({
      id: response.modelId,
      name: response.modelName,
    })) ?? null;

  return (
    <ArenaScreen
      catalog={catalog}
      defaultSelection={catalog ? defaultModelSelection(catalog) : []}
      onCastVote={castVoteAction}
      threadId={thread.id}
      initialTurns={initialTurns}
      lockedModels={lockedModels}
    />
  );
}
