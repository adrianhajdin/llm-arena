import type { TouchedThread } from "@/infrastructure/thread-history-store";

/**
 * The pure half of the sidebar's thread list: the shapes, the recency labels,
 * and the rule for folding in threads the browser knows about but the last
 * server render did not.
 *
 * Split out of `thread-history.ts` for the reason `docs/coding-standards.md`
 * already gives for `model-catalog.ts` versus `fetch-model-catalog.ts`: that
 * module is `server-only` because it queries Postgres, and the sidebar is a
 * client component that needs these same rules. Without the split the label
 * strings would have to be duplicated into client code and could drift from the
 * grouping that produced them.
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

/** "Today", "This week" (the six days before that), then "Earlier". */
export const TODAY = "Today";
const THIS_WEEK = "This week";
const EARLIER = "Earlier";

export const GROUP_ORDER = [TODAY, THIS_WEEK, EARLIER] as const;

export const groupLabel = (updatedAt: Date, today: Date, weekAgo: Date): string => {
  if (updatedAt >= today) return TODAY;
  if (updatedAt >= weekAgo) return THIS_WEEK;
  return EARLIER;
};

/**
 * The server's list, plus whatever this browser has sent a prompt to since that
 * list was rendered.
 *
 * This exists because a first prompt no longer navigates: the thread it creates
 * is real and open on screen while the sidebar's server-rendered list has never
 * heard of it (`docs/scope.md`). Rather than force a server round trip to fix
 * that — every mechanism for doing so re-renders the current route and reapplies
 * its tree, which has broken the arena twice — the browser reports what it did
 * and this folds it in.
 *
 * Two jobs, not one. A thread missing from the list gets added, and a thread the
 * list already has but files under an older heading gets pulled up to today,
 * because sending to a month-old thread genuinely does make it today's.
 *
 * Server data always wins where it exists: its `modelCount` counts every model
 * across the whole thread, where the caller only knows the turn it just sent.
 * The caller's own values are used only for a thread the server has never
 * mentioned, which is exactly the case where they are complete. That is also
 * what makes this self-cleaning — once any navigation brings the real list back,
 * the fold-in becomes a no-op rather than a second copy.
 */
export const mergeTouchedThreads = (
  groups: readonly ThreadGroup[],
  touched: readonly TouchedThread[],
): readonly ThreadGroup[] => {
  if (touched.length === 0) return groups;

  const touchedIds = new Set(touched.map((thread) => thread.id));

  const known = new Map(
    groups.flatMap((group) => group.threads).map((thread) => [thread.id, thread]),
  );

  // `touched` arrives most-recently-sent first, which is the order the server
  // would also produce, since it sorts by `updatedAt` descending.
  const promoted = touched.map(
    (thread) =>
      known.get(thread.id) ?? {
        id: thread.id,
        title: thread.title,
        modelCount: thread.modelCount,
      },
  );

  const withoutTouched = groups
    .map((group) => ({
      ...group,
      threads: group.threads.filter((thread) => !touchedIds.has(thread.id)),
    }))
    .filter((group) => group.threads.length > 0);

  return [
    {
      label: TODAY,
      threads: [
        ...promoted,
        ...(withoutTouched.find((group) => group.label === TODAY)?.threads ?? []),
      ],
    },
    ...withoutTouched.filter((group) => group.label !== TODAY),
  ];
};
