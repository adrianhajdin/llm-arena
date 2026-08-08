"use client";

import { useEffect, useState } from "react";

/**
 * Clerk loads its UI bundle lazily and mounts it inside an async callback, so a
 * failed chunk fetch throws outside React's render. No `error.tsx` boundary can
 * catch that, and the auth widget just vanishes with no message and no retry —
 * which breaks this app's rule that a provider failure always shows a plain
 * sentence and a way out.
 *
 * `window` is the only place such a throw is observable, so recovery lives here
 * rather than at any one mount point, and it covers any lazy chunk, not only
 * Clerk's. It never calls `preventDefault`, so PostHog still records the
 * failure — this adds a way out, it does not hide the signal.
 */
const isChunkLoadError = (value: unknown): boolean => {
  if (typeof value !== "object" || value === null) return false;

  const { name, message } = value as { name?: unknown; message?: unknown };

  return (
    name === "ChunkLoadError" ||
    (typeof message === "string" &&
      /ChunkLoadError|Loading (?:CSS )?chunk .* failed/i.test(message))
  );
};

export const ChunkLoadRecovery = () => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const flagIfChunkError = (value: unknown) => {
      if (isChunkLoadError(value)) setFailed(true);
    };
    const onError = (event: ErrorEvent) => flagIfChunkError(event.error);
    const onRejection = (event: PromiseRejectionEvent) => flagIfChunkError(event.reason);

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  if (!failed) return null;

  return (
    <div
      role="alert"
      className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4"
    >
      <div className="surface border-destructive/40 bg-destructive/8 flex w-full max-w-md flex-col px-4 py-3.5">
        <p className="text-destructive text-sm font-medium">
          Part of the page didn&rsquo;t load
        </p>
        <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
          Something went wrong on our side, not yours. This is usually brief. Reload the
          page and it should come back.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="border-input hover:bg-muted mt-3 self-start rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors"
        >
          Reload
        </button>
      </div>
    </div>
  );
};
