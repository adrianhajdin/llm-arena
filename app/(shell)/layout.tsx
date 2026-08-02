import { Show, UserButton } from "@clerk/nextjs";

import { AppShell } from "@/features/shell/app-shell";
import { ThemeToggle } from "@/features/theme/theme-toggle";

/**
 * A route group rather than the root layout, because the root layout has to stay
 * wrappable around screens that must not get a sidebar. The frame belongs to the
 * four real screens, not to everything the app will ever render.
 *
 * The sidebar's footer is composed here rather than inside the shell feature: a
 * feature may not import another feature, and routes are the layer that puts
 * features together.
 */
export default function ShellLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AppShell
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
