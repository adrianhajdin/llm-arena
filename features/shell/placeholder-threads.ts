/**
 * PLACEHOLDER — feature 7 replaces this with the signed-in user's real threads,
 * read through `@/infrastructure/database`. Delete this file and the one import
 * of it in `sidebar.tsx` when that query exists.
 *
 * Grouped by recency rather than numbered, because the grouping says something
 * true (a thread from an hour ago and one from last month are different kinds
 * of thing) and a number would claim a sequence that does not exist.
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

export const PLACEHOLDER_THREAD_GROUPS: readonly ThreadGroup[] = [
  {
    label: "Today",
    threads: [
      { id: "f3a9c1", title: "Explain OKLCH to a designer", modelCount: 3 },
      { id: "b71e04", title: "Rewrite this cold email", modelCount: 2 },
    ],
  },
  {
    label: "This week",
    threads: [
      { id: "9d2f77", title: "Postgres index for a slow join", modelCount: 3 },
      { id: "4c8a15", title: "Name a coffee shop, 20 options", modelCount: 3 },
    ],
  },
  {
    label: "Earlier",
    threads: [{ id: "22b6de", title: "Summarise a 40-page contract", modelCount: 2 }],
  },
];
