import "server-only";

import { database } from "@/infrastructure/database";

/**
 * The signed-in user's own threads, grouped by recency rather than numbered:
 * a thread from an hour ago and one from last month are different kinds of
 * thing, and a number would claim a sequence that does not exist.
 */

export type ThreadSummary = {
  readonly id: string;
  readonly title: string;
  readonly modelCount: number;
};

export type ThreadGroup = {
  readonly label: string;
  readonly threads: readonly ThreadSummary[];
};

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

/** "Today", "This week" (the six days before that), then "Earlier". */
const groupLabel = (updatedAt: Date, today: Date, weekAgo: Date): string => {
  if (updatedAt >= today) return "Today";
  if (updatedAt >= weekAgo) return "This week";
  return "Earlier";
};

export const listThreadHistory = async (
  userId: string,
): Promise<readonly ThreadGroup[]> => {
  const threads = await database().thread.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      updatedAt: true,
      turns: { select: { responses: { select: { modelId: true } } } },
    },
  });

  const today = startOfDay(new Date());
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 6);

  const groups = new Map<string, ThreadSummary[]>();

  for (const thread of threads) {
    const label = groupLabel(thread.updatedAt, today, weekAgo);
    const modelCount = new Set(
      thread.turns.flatMap((turn) => turn.responses.map((response) => response.modelId)),
    ).size;

    const group = groups.get(label) ?? [];
    group.push({ id: thread.id, title: thread.title, modelCount });
    groups.set(label, group);
  }

  return ["Today", "This week", "Earlier"]
    .filter((label) => groups.has(label))
    .map((label) => ({ label, threads: groups.get(label)! }));
};
