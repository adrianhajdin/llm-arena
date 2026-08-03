"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * What this browser has sent a prompt to, so the sidebar can show a thread the
 * last server render never heard of.
 *
 * It lives in `infrastructure/` rather than in either feature because both need
 * it and neither may import the other: `features/arena` writes to it when a
 * prompt is accepted, `features/shell` reads it when it draws the thread list.
 * `docs/coding-standards.md` names exactly this case — "if two features need the
 * same thing, it belongs in `infrastructure/`".
 *
 * Deliberately the smallest thing that works. It is not a cache of the thread
 * list and must never become one: the server's list is the truth, this is only a
 * short note about what happened since it was drawn, and every consumer prefers
 * server data where both exist (see `mergeTouchedThreads`).
 *
 * A missing provider degrades to a no-op instead of throwing. The alternative
 * would be an arena that crashes because a sidebar convenience was not wired,
 * and that trade is not close.
 */
export type TouchedThread = Readonly<{
  id: string;
  title: string;
  /** Models this browser just sent to. Only used for a thread the server's list does not have. */
  modelCount: number;
}>;

type ThreadHistoryStore = Readonly<{
  touched: readonly TouchedThread[];
  noteThreadTouched: (thread: TouchedThread) => void;
}>;

const NO_OP_STORE: ThreadHistoryStore = Object.freeze({
  touched: Object.freeze([]),
  noteThreadTouched: () => {},
});

const ThreadHistoryContext = createContext<ThreadHistoryStore>(NO_OP_STORE);

export const ThreadHistoryProvider = ({ children }: { readonly children: ReactNode }) => {
  const [touched, setTouched] = useState<readonly TouchedThread[]>([]);

  // Most recent first, and one entry per thread: sending twice to the same
  // thread moves it to the front rather than listing it twice.
  const noteThreadTouched = useCallback(
    (thread: TouchedThread) =>
      setTouched((current) => [
        thread,
        ...current.filter((existing) => existing.id !== thread.id),
      ]),
    [],
  );

  const value = useMemo(
    () => ({ touched, noteThreadTouched }),
    [touched, noteThreadTouched],
  );

  return (
    <ThreadHistoryContext.Provider value={value}>
      {children}
    </ThreadHistoryContext.Provider>
  );
};

export const useThreadHistory = (): ThreadHistoryStore =>
  useContext(ThreadHistoryContext);
