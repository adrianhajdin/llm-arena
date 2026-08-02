import { Show, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";

import { AppShell } from "@/features/shell/app-shell";
import { listThreadHistory } from "@/features/shell/thread-history";
import { ThemeToggle } from "@/features/theme/theme-toggle";
import { findAppUserId } from "@/infrastructure/current-user";

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
 */
export default async function ShellLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { userId: clerkId } = await auth();
  const appUserId = clerkId ? await findAppUserId(clerkId) : null;
  const threadGroups = appUserId ? await listThreadHistory(appUserId) : [];

  return (
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
  );
}
