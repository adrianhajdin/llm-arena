"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { CloseIcon } from "./icons";
import { Sidebar } from "./sidebar";
import { type ThreadGroup } from "./thread-history";
import { TopBar } from "./top-bar";

/**
 * The frame: a sidebar and a top bar that stay put while the content under them
 * scrolls. Above `lg` the sidebar is simply there; below it, the same sidebar
 * becomes an overlay drawer rather than a second component maintained in
 * parallel, so a change to the nav can never land in one and miss the other.
 *
 * The drawer owes real keyboard behaviour, which is why it is worth the state:
 * Escape closes it, opening moves focus into it, closing returns focus to the
 * control that opened it, and following any link inside it closes it.
 */
export const AppShell = ({
  children,
  sidebarFooter,
  threadGroups,
}: {
  readonly children: ReactNode;
  readonly sidebarFooter: ReactNode;
  readonly threadGroups: readonly ThreadGroup[];
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const openerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const closeDrawer = () => {
    setDrawerOpen(false);
    openerRef.current?.focus();
  };

  useEffect(() => {
    if (!drawerOpen) return;

    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDrawerOpen(false);
        openerRef.current?.focus();
      }
    };

    const { body } = document;
    const restoreOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      body.style.overflow = restoreOverflow;
    };
  }, [drawerOpen]);

  return (
    <div className="flex h-dvh overflow-hidden">
      <a
        href="#main"
        className="bg-card border-border sr-only rounded-lg border px-4 py-2 text-sm font-medium focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50"
      >
        Skip to content
      </a>

      <aside
        aria-label="Navigation"
        className="border-border hidden w-64 shrink-0 border-r lg:block"
      >
        <Sidebar footer={sidebarFooter} threadGroups={threadGroups} />
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            tabIndex={-1}
            onClick={closeDrawer}
            className="bg-foreground/40 absolute inset-0 cursor-default"
          />
          <aside
            aria-label="Navigation"
            className="bg-background border-border absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r"
          >
            <button
              ref={closeRef}
              type="button"
              onClick={closeDrawer}
              aria-label="Close navigation"
              className="text-muted-foreground hover:text-foreground hover:bg-muted absolute top-3.5 right-3 rounded-lg p-1.5 transition-colors"
            >
              <CloseIcon className="size-5" />
            </button>
            <Sidebar
              footer={sidebarFooter}
              onNavigate={closeDrawer}
              threadGroups={threadGroups}
            />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onOpenSidebar={() => setDrawerOpen(true)} openerRef={openerRef} />
        <main id="main" className="min-h-0 flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
