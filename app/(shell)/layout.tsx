import { Show, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { unstable_rethrow } from "next/navigation";

import { AppShell } from "@/features/shell/app-shell";
import { listThreadHistory } from "@/features/shell/thread-history";
import { type ThreadGroup } from "@/features/shell/thread-groups";
import { ThemeToggle } from "@/features/theme/theme-toggle";
import { findAppUserId } from "@/infrastructure/current-user";
import { ThreadHistoryProvider } from "@/infrastructure/thread-history-store";

/**
 * A route group rather than the root layout, because the root layout has to stay
 * wrappable around screens that must not get a sidebar. The frame belongs to the
 * four real screens, not to everything the app will ever render.
 *
 * The sidebar's footer is composed here rather than inside the shell feature: a
 * feature may not import another feature, and routes are the layer that puts
 * features together.
 *
 * The thread list is read here too, server-side, for the same reason: the
 * sidebar needs a signed-in person's real threads, and only a route may reach
 * into both Clerk and the database on a feature's behalf.
 *
 * Those two reads are the layout's one real risk: this layout wraps every
 * screen, and a throw here escapes its own segment's `error.tsx` and takes the
 * whole app to the framework's raw error page. So it degrades rather than
 * throws, the same way `fetch-model-catalog.ts` does — the real reason goes to
 * the server log, an empty list stands in for the history, and the frame stays
 * usable. `global-error.tsx` is the backstop for anything this doesn't catch.
 */
const loadThreadHistory = async (): Promise<readonly ThreadGroup[]> => {
  try {
    const { userId: clerkId } = await auth();
    const appUserId = clerkId ? await findAppUserId(clerkId) : null;

    return appUserId ? await listThreadHistory(appUserId) : [];
  } catch (error) {
    // Let Next's own control-flow signals through untouched — a `redirect()`
    // or `notFound()` from Clerk, and the dynamic-rendering bail-out that marks
    // this route dynamic at build time — and degrade only on a genuine failure.
    unstable_rethrow(error);
    console.error("[shell] could not load the sidebar's thread history", error);

    return [];
  }
};

export default async function ShellLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const threadGroups = await loadThreadHistory();

  /**
   * The provider wraps the whole shell rather than just the sidebar, because the
   * two halves of it sit on opposite sides of this layout: the arena inside
   * `children` writes to it when a prompt is accepted, and the sidebar reads it
   * when it draws the thread list. It exists because a first prompt no longer
   * navigates, so nothing re-runs this server component to pick the new thread
   * up (`docs/scope.md`).
   */
  return (
    <ThreadHistoryProvider>
      <AppShell
        threadGroups={threadGroups}
        sidebarFooter={
          <>
            <Show when="signed-in">
              <UserButton />
            </Show>
            <ThemeToggle className="ml-auto" />
          </>
        }
      >
        {children}
      </AppShell>
    </ThreadHistoryProvider>
  );
}
