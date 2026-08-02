"use client";

import { useEffect } from "react";

/**
 * The last line. `error.tsx` boundaries catch a throw inside a segment, but not
 * a throw from the root layout or from a segment's own layout — the shell
 * layout's server reads are exactly that case. When one of those fails, this
 * replaces the entire document, providers and all, so it cannot lean on the
 * theme context, the fonts, or `globals.css`: it carries its own styles and its
 * own `<html>`/`<body>`, and reads honestly on a light or dark system either
 * way.
 *
 * It says the same plain thing every failure here says, and offers the one
 * action that can help — reload the whole app — because at this depth there is
 * no narrower thing left to retry.
 */
export default function GlobalError({
  error,
  reset,
}: {
  readonly error: Error & { readonly digest?: string };
  readonly reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] the shell failed to render", error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <style>{`
          :root {
            color-scheme: light dark;
            --bg: #f7f6f4;
            --card: #ffffff;
            --border: #e4e1dc;
            --fg: #1c1a17;
            --muted: #6b6560;
          }
          @media (prefers-color-scheme: dark) {
            :root {
              --bg: #141311;
              --card: #1d1b19;
              --border: #302d2a;
              --fg: #ece9e4;
              --muted: #a09a93;
            }
          }
          .ge-page {
            margin: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1.5rem;
            background: var(--bg);
            color: var(--fg);
            font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
          }
          .ge-card {
            max-width: 28rem;
            border: 1px solid var(--border);
            background: var(--card);
            border-radius: 0.75rem;
            padding: 1.5rem;
          }
          .ge-title { margin: 0; font-size: 1rem; font-weight: 600; }
          .ge-body { margin: 0.5rem 0 0; font-size: 0.875rem; line-height: 1.6; color: var(--muted); }
          .ge-btn {
            margin-top: 1rem;
            border: 1px solid var(--border);
            background: transparent;
            color: inherit;
            border-radius: 0.5rem;
            padding: 0.375rem 0.75rem;
            font-size: 0.875rem;
            font-weight: 500;
            cursor: pointer;
          }
          .ge-btn:hover { background: var(--border); }
          .ge-btn:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
        `}</style>
        <div className="ge-page">
          <div className="ge-card">
            <h1 className="ge-title">The arena didn&rsquo;t load</h1>
            <p className="ge-body">
              Something went wrong on our side, not yours. This is usually brief. Reload
              the page and it should come back.
            </p>
            <button type="button" className="ge-btn" onClick={reset}>
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
