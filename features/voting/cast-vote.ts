import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { database } from "@/infrastructure/database";

/**
 * The one and only way a vote is created.
 *
 * "A vote should only ever be possible on a turn where two or more models
 * actually answered" is a real rule with no database constraint behind it, by
 * decision (docs/scope.md, feature 3): expressing it in Postgres would need a
 * denormalized counter on the turn plus hand-written SQL the schema could not
 * see, and a counter that can drift is a worse guarantee than a single write
 * path that cannot be bypassed. This module is that write path. Nothing else
 * may insert into `votes`.
 *
 * The count and the insert share one transaction, so two clicks arriving at
 * once cannot both read "two answers" and both write. The unique index on
 * `turnId` is the backstop underneath that: Postgres reads at `read committed`,
 * so two racing votes can both see no vote yet, and the loser of that race is
 * rejected by the index rather than becoming a second vote. That rejection is
 * caught below and returned as the same `already-voted` refusal the read path
 * produces, because a caller turning this into a sentence should not have to
 * care which of the two guards fired.
 */

/** Why a vote was refused, in terms the caller can turn into a sentence. */
export type VoteRefusal =
  | "turn-not-found"
  | "not-your-thread"
  | "not-enough-answers"
  | "already-voted"
  | "response-not-a-candidate";

export type CastVoteResult =
  Readonly<{ ok: true; voteId: string }> | Readonly<{ ok: false; refusal: VoteRefusal }>;

export type CastVoteInput = Readonly<{
  turnId: string;
  /** The `users.id` of the voter, already resolved from the Clerk session. */
  userId: string;
  /** The answer being crowned. Must belong to this turn and have completed. */
  modelResponseId: string;
}>;

/** Two is the floor. One model answering is not a comparison. */
const MINIMUM_ANSWERS_TO_COMPARE = 2;

const refuse = (refusal: VoteRefusal): CastVoteResult =>
  Object.freeze({ ok: false as const, refusal });

/**
 * A unique index on `votes` rejecting this insert as a duplicate.
 *
 * `turnId` and `modelResponseId` are the only unique columns on the table, and
 * a response belongs to exactly one turn, so either violation says the same
 * thing: this turn has already been decided. The specific index is not worth
 * inspecting, because the answer would be the same either way.
 */
const isDuplicateVote = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";

export const castVote = async ({
  turnId,
  userId,
  modelResponseId,
}: CastVoteInput): Promise<CastVoteResult> =>
  database().$transaction(async (tx) => {
    const turn = await tx.turn.findUnique({
      where: { id: turnId },
      select: {
        thread: { select: { userId: true } },
        vote: { select: { id: true } },
        responses: {
          where: { status: "COMPLETE" },
          select: { id: true },
        },
      },
    });

    if (turn === null) return refuse("turn-not-found");

    // Voting belongs to the thread's owner. A public viewer reads the whole
    // thread but does not get to decide its record (docs/scope.md, feature 8).
    if (turn.thread.userId !== userId) return refuse("not-your-thread");

    if (turn.vote !== null) return refuse("already-voted");

    if (turn.responses.length < MINIMUM_ANSWERS_TO_COMPARE) {
      return refuse("not-enough-answers");
    }

    // The winner has to be one of the answers actually being compared, so a
    // stale or forged id cannot crown a response from some other turn, or one
    // that failed and has no answer to judge.
    if (!turn.responses.some((response) => response.id === modelResponseId)) {
      return refuse("response-not-a-candidate");
    }

    // The read above can be beaten by a vote committed between it and this
    // insert, and the index rejecting that loser must read as a refusal rather
    // than escape as a raw Prisma error the caller has no sentence for.
    try {
      const vote = await tx.vote.create({
        data: { turnId, userId, modelResponseId },
        select: { id: true },
      });

      return Object.freeze({ ok: true as const, voteId: vote.id });
    } catch (error) {
      if (isDuplicateVote(error)) return refuse("already-voted");
      throw error;
    }
  });
