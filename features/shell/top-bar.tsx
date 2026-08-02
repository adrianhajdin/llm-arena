"use client";

import { usePathname } from "next/navigation";
import { type RefObject, useState } from "react";

import { CheckIcon, LinkIcon, PanelIcon } from "./icons";
import { PLACEHOLDER_STANDINGS } from "./placeholder-standings";
import { StandingsStrip } from "./standings-strip";

/**
 * The breadcrumb describes where you are, which is not the same thing as the
 * URL. A thread lives at `/t/f3a9c1` because that is the link people paste, and
 * it still reads "Arena / Thread f3a9c1" here, because nobody navigates by
 * thinking about path segments.
 */
const describe = (pathname: string): readonly string[] => {
  if (pathname === "/") return ["Arena"];
  if (pathname.startsWith("/t/")) return ["Arena", `Thread ${pathname.slice(3)}`];
  if (pathname.startsWith("/leaderboard")) return ["Leaderboard"];
  if (pathname.startsWith("/models")) return ["Models"];
  if (pathname.startsWith("/design")) return ["Design proof"];
  return ["Arena"];
};

/** A brand-new thread has no turns yet, so there is no record to show. */
const showsStandings = (pathname: string) => pathname.startsWith("/t/");

/**
 * This is the whole "sharing" half of feature 8: the link already works for
 * anyone, signed in or not (the page itself has no gate), so this button
 * doesn't ask permission, it just copies the url that's already sitting in
 * the address bar and says so, briefly, rather than a bare icon that gives
 * no feedback that anything actually happened.
 */
const ShareButton = () => {
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={copyLink}
      className="border-input hover:bg-muted text-muted-foreground hover:text-foreground flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors"
    >
      {copied ? (
        <>
          <CheckIcon className="text-winner size-3.5" />
          <span aria-live="polite">Copied</span>
        </>
      ) : (
        <>
          <LinkIcon className="size-3.5" />
          Copy link
        </>
      )}
    </button>
  );
};

export const TopBar = ({
  onOpenSidebar,
  openerRef,
}: {
  readonly onOpenSidebar: () => void;
  /** Held by the shell so closing the drawer can hand focus back to this button. */
  readonly openerRef: RefObject<HTMLButtonElement | null>;
}) => {
  const pathname = usePathname();
  const crumbs = describe(pathname);

  return (
    <header className="border-border bg-background/85 sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b px-3 backdrop-blur-sm sm:px-4">
      <button
        ref={openerRef}
        type="button"
        onClick={onOpenSidebar}
        className="text-muted-foreground hover:text-foreground hover:bg-muted -ml-1 rounded-lg p-2 transition-colors lg:hidden"
        aria-label="Open navigation"
      >
        <PanelIcon className="size-5" />
      </button>

      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="flex min-w-0 items-center gap-1.5 text-sm">
          {crumbs.map((crumb, index) => (
            <li key={crumb} className="flex min-w-0 items-center gap-1.5">
              {index > 0 && (
                <span className="text-muted-foreground/60" aria-hidden>
                  /
                </span>
              )}
              <span
                className={
                  index === crumbs.length - 1
                    ? "truncate"
                    : "text-muted-foreground hidden truncate sm:inline"
                }
                aria-current={index === crumbs.length - 1 ? "page" : undefined}
              >
                {crumb}
              </span>
            </li>
          ))}
        </ol>
      </nav>

      {pathname.startsWith("/t/") && <ShareButton />}
      {showsStandings(pathname) && <StandingsStrip standings={PLACEHOLDER_STANDINGS} />}
    </header>
  );
};
