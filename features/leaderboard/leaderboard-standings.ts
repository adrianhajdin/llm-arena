import "server-only";

import { database } from "@/infrastructure/database";

/**
 * One function serves both leaderboards: pass `null` for everyone's votes,
 * or a signed-in user's app id to scope every number to threads they own.
 * "of" is how many times a model has actually answered (completed calls
 * only, per feature 3), "won" is how many of those answers were picked.
 * Averages are computed over that same completed set, never a made-up
 * score, and there is no cost column since every model here is free.
 */

export type LeaderboardRow = {
  readonly modelId: string;
  readonly modelName: string;
  readonly won: number;
  readonly of: number;
  readonly avgFirstTokenMs: number | null;
  readonly avgTokensPerSecond: number | null;
};

type Accumulator = {
  modelName: string;
  of: number;
  won: number;
  ttftSum: number;
  ttftCount: number;
  tpsSum: number;
  tpsCount: number;
};

export const getLeaderboardStandings = async (
  scopeUserId: string | null,
): Promise<readonly LeaderboardRow[]> => {
  const threadScope = scopeUserId ? { turn: { thread: { userId: scopeUserId } } } : {};

  const [responses, votes] = await Promise.all([
    database().modelResponse.findMany({
      where: { status: "COMPLETE", ...threadScope },
      orderBy: { createdAt: "asc" },
      select: {
        modelId: true,
        modelName: true,
        timeToFirstTokenMs: true,
        tokensPerSecond: true,
      },
    }),
    database().vote.findMany({
      where: scopeUserId ? { userId: scopeUserId } : {},
      select: { modelResponse: { select: { modelId: true } } },
    }),
  ]);

  const byModel = new Map<string, Accumulator>();

  for (const response of responses) {
    const acc = byModel.get(response.modelId) ?? {
      modelName: response.modelName,
      of: 0,
      won: 0,
      ttftSum: 0,
      ttftCount: 0,
      tpsSum: 0,
      tpsCount: 0,
    };

    acc.modelName = response.modelName;
    acc.of += 1;
    if (response.timeToFirstTokenMs != null) {
      acc.ttftSum += response.timeToFirstTokenMs;
      acc.ttftCount += 1;
    }
    if (response.tokensPerSecond != null) {
      acc.tpsSum += Number(response.tokensPerSecond);
      acc.tpsCount += 1;
    }

    byModel.set(response.modelId, acc);
  }

  for (const vote of votes) {
    const acc = byModel.get(vote.modelResponse.modelId);
    if (acc) acc.won += 1;
  }

  const rows: LeaderboardRow[] = Array.from(byModel.entries()).map(([modelId, acc]) => ({
    modelId,
    modelName: acc.modelName,
    won: acc.won,
    of: acc.of,
    avgFirstTokenMs: acc.ttftCount > 0 ? Math.round(acc.ttftSum / acc.ttftCount) : null,
    avgTokensPerSecond: acc.tpsCount > 0 ? acc.tpsSum / acc.tpsCount : null,
  }));

  return rows.sort((a, b) => {
    const rateDiff = b.won / b.of - a.won / a.of;
    if (rateDiff !== 0) return rateDiff;
    if (b.of !== a.of) return b.of - a.of;
    return a.modelName.localeCompare(b.modelName);
  });
};
