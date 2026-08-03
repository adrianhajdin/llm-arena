"use client";

import { SignInButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

import { cn } from "@/infrastructure/ui";
import { useThreadHistory } from "@/infrastructure/thread-history-store";

import { ArenaIcon, LeaderboardIcon, ModelsIcon, PlusIcon } from "./icons";
import { mergeTouchedThreads, type ThreadGroup } from "./thread-groups";

const NAV = [
  { href: "/", label: "Arena", Icon: ArenaIcon },
  { href: "/leaderboard", label: "Leaderboard", Icon: LeaderboardIcon },
  { href: "/models", label: "Models", Icon: ModelsIcon },
] as const;

/** The arena owns both the root and every thread under it. */
const isActive = (href: string, pathname: string) =>
  href === "/"
    ? pathname === "/" || pathname.startsWith("/t/")
    : pathname.startsWith(href);

/**
 * The sidebar takes its footer as a slot rather than importing the theme toggle
 * and Clerk's user button itself. A feature may not reach into another feature,
 * so `app/(shell)/layout.tsx` composes those in, which is the layering this
 * project already holds: routes compose features, never the reverse.
 */
export const Sidebar = ({
  footer,
  onNavigate,
  threadGroups,
}: {
  readonly footer: ReactNode;
  readonly onNavigate?: () => void;
  readonly threadGroups: readonly ThreadGroup[];
}) => {
  const pathname = usePathname();
  /* `Show` is server-only in Clerk 7, and this list has to react to the drawer
     and the current route, so the signed-in state comes from the hook. */
  const { isLoaded, isSignedIn } = useAuth();

  /* `threadGroups` is whatever the last server render of the shell layout
     produced. A first prompt no longer navigates, so a thread can be open on
     screen and absent from that list; this folds in what the browser knows and
     becomes a no-op again as soon as any navigation refreshes the real thing. */
  const { touched } = useThreadHistory();
  const groups = mergeTouchedThreads(threadGroups, touched);

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-5 pb-4">
        <Link
          href="/"
          onClick={onNavigate}
          className="font-display rounded-sm text-xl tracking-tight"
        >
          LLM Arena
        </Link>
      </div>

      <nav aria-label="Sections" className="px-3">
        <ul className="flex flex-col gap-0.5">
          {NAV.map(({ href, label, Icon }) => {
            const active = isActive(href, pathname);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                    active
                      ? "bg-muted text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-6 flex min-h-0 flex-1 flex-col">
        <div className="border-border mx-3 flex items-center justify-between border-t pt-4 pb-1">
          <h2 className="text-eyebrow px-2.5">Your threads</h2>
          {isSignedIn && (
            <Link
              href="/"
              onClick={onNavigate}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors"
            >
              <PlusIcon className="size-3.5" />
              New
            </Link>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          {isLoaded && !isSignedIn && (
            <div className="px-2.5 py-3">
              <p className="text-muted-foreground text-sm leading-relaxed">
                Sign in to keep your threads and vote on answers.
              </p>
              <SignInButton mode="modal">
                <button
                  type="button"
                  className="border-input hover:bg-muted mt-3 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors"
                >
                  Sign in
                </button>
              </SignInButton>
            </div>
          )}

          {isSignedIn && groups.length === 0 && (
            <p className="text-muted-foreground px-2.5 py-3 text-sm leading-relaxed">
              Nothing yet. Send a prompt to start your first thread.
            </p>
          )}

          {isSignedIn &&
            groups.map((group) => (
              <section key={group.label} className="mb-4 last:mb-0">
                <h3 className="text-muted-foreground px-2.5 py-1.5 text-xs">
                  {group.label}
                </h3>
                <ul className="flex flex-col gap-0.5">
                  {group.threads.map((thread) => {
                    const active = pathname === `/t/${thread.id}`;
                    return (
                      <li key={thread.id}>
                        <Link
                          href={`/t/${thread.id}`}
                          onClick={onNavigate}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
                            active
                              ? "bg-muted text-foreground"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                          )}
                        >
                          <span className="truncate">{thread.title}</span>
                          <span className="metric shrink-0">
                            <span className="sr-only">, </span>
                            {thread.modelCount}
                            <span className="sr-only"> models</span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
        </div>
      </div>

      <div className="border-border flex items-center gap-2 border-t px-4 py-3">
        {footer}
      </div>
    </div>
  );
};
