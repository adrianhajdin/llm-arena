"use server";

import { auth } from "@clerk/nextjs/server";

import { trackVoteCast } from "@/infrastructure/analytics-events";
import { findAppUserId } from "@/infrastructure/current-user";

import { castVote, type VoteRefusal } from "./cast-vote";

/** Every refusal `castVote` can return, in the plain sentence a button needs. */
const REFUSAL_MESSAGES: Record<VoteRefusal, string> = {
  "turn-not-found": "That turn doesn't exist any more.",
  "not-your-thread": "Only the thread's owner can vote on it.",
  "not-enough-answers": "At least two models need to answer before you can vote.",
  "already-voted": "This turn already has a winner.",
  "response-not-a-candidate": "That answer isn't one of this turn's models.",
};

export type CastVoteActionResult =
  Readonly<{ ok: true }> | Readonly<{ ok: false; error: string }>;

export const castVoteAction = async (input: {
  readonly turnId: string;
  readonly modelResponseId: string;
}): Promise<CastVoteActionResult> => {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    return { ok: false, error: "Sign in to vote." };
  }

  const userId = await findAppUserId(clerkId);

  if (!userId) {
    return { ok: false, error: "Sign in to vote." };
  }

  const result = await castVote({
    turnId: input.turnId,
    userId,
    modelResponseId: input.modelResponseId,
  });

  if (!result.ok) {
    return { ok: false, error: REFUSAL_MESSAGES[result.refusal] };
  }

  trackVoteCast({
    clerkId,
    turnId: input.turnId,
    modelResponseId: input.modelResponseId,
  });

  return { ok: true };
};
