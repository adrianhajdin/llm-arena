import { ArenaSkeleton } from "@/features/arena/arena-skeleton";

/**
 * The gap between asking for a screen and having one.
 *
 * Every route in this group renders dynamically — Clerk's `auth()`, the thread
 * and leaderboard queries, the model catalog — so a navigation here always waits
 * on a real server render. Without this boundary the App Router had nothing to
 * show during that wait and simply held the previous screen frozen, which is
 * what made a brand-new thread's first prompt read as "nothing happened": the
 * composer sat there unchanged while `/t/[threadId]` rendered behind it.
 *
 * This file is the fallback for the arena root specifically. `/t/[threadId]`,
 * `/leaderboard` and `/models` each carry their own, because feature 4 permits a
 * skeleton only where the wait has a *known shape*, and one shared fallback
 * across four differently-shaped screens would be shaped wrongly for at least
 * three of them.
 *
 * Because these sit beside the shell layout rather than inside a screen, the
 * sidebar and top bar stay rendered and interactive throughout — only the
 * content area is ever in this state.
 */
export default function ArenaLoading() {
  return <ArenaSkeleton />;
}
