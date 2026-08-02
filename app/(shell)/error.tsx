"use client";

import { useEffect } from "react";

/**
 * The boundary for everything that renders inside the shell frame. A screen
 * throwing on the server used to take the whole route group down to Next's
 * default error page; now the sidebar and top bar stay put and the person gets
 * a plain sentence and a way out, which is the rule this app holds itself to.
 *
 * This does not catch a throw from the shell layout itself — an error boundary
 * never catches its own segment's layout — so `global-error.tsx` backstops that
 * case and the layout guards its own reads. Between the three, nothing in the
 * app reaches the framework's raw screen.
 *
 * A boundary must be a client component, and the real reason only exists here,
 * so it is logged from the client rather than lost. In production the message
 * is React's redacted placeholder and `digest` is the thread back to the
 * server log, which is why it is worth logging at all.
 */
export default function ShellError({
  error,
  reset,
}: {
  readonly error: Error & { readonly digest?: string };
  readonly reset: () => void;
}) {
  useEffect(() => {
    console.error("[shell] a screen failed to render", error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col px-4 py-16 sm:py-24">
      <div className="border-destructive/40 bg-destructive/8 rounded-xl border px-4 py-3.5">
        <p className="text-destructive flex items-center gap-2 text-sm font-medium">
          <svg viewBox="0 0 16 16" className="size-4" fill="currentColor" aria-hidden>
            <path d="M8 1.5 15 14H1zm0 4.2a.8.8 0 0 0-.8.85l.25 3.1a.55.55 0 0 0 1.1 0l.25-3.1A.8.8 0 0 0 8 5.7m0 5.1a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6" />
          </svg>
          This screen didn&rsquo;t load
        </p>
        <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
          Something went wrong on our side, not yours. The rest of the arena still works.
          Try again, and if it keeps happening it will pass.
        </p>
        <button
          type="button"
          onClick={reset}
          className="border-input hover:bg-muted mt-3 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
