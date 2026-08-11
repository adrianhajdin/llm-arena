import { auth } from "@clerk/nextjs/server";

import { LeaderboardScreen } from "@/features/leaderboard/leaderboard-screen";
import { getLeaderboardStandings } from "@/features/leaderboard/leaderboard-standings";
import { findAppUserId } from "@/infrastructure/current-user";

/**
 * "Just me" cannot exist without an account, same reasoning as feature 7's
 * thread list: it fetches nothing and shows a sign-in invitation instead.
 */
export default async function LeaderboardPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly view?: string }>;
}) {
  const { view: rawView } = await searchParams;
  const view = rawView === "me" ? "me" : "everyone";

  const { userId: clerkId } = await auth();
  const viewerId = clerkId ? await findAppUserId(clerkId) : null;

  // Only a missing Clerk session is a real reason to invite a sign-in. A
  // signed-in person with no `users` row yet (their first prompt is not
  // written) has simply cast no votes, so they fall through to EmptyNotice.
  const needsSignIn = view === "me" && clerkId === null;
  const rows =
    view === "me"
      ? viewerId
        ? await getLeaderboardStandings(viewerId)
        : []
      : await getLeaderboardStandings(null);

  return <LeaderboardScreen rows={rows} view={view} needsSignIn={needsSignIn} />;
}
