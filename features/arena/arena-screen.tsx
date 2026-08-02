"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { type CatalogModel } from "@/infrastructure/model-catalog";
import { cn } from "@/infrastructure/ui";

import { Composer } from "./composer";
import { InstrumentStrip } from "./instrument-strip";
import { buildModelMessages } from "./model-messages";
import { startTurn } from "./start-turn";
import { streamModelAnswer } from "./stream-model-answer";
import type { ResponseState, TurnState } from "./turn-state";

/**
 * The real arena: one prompt fanned out to every selected model, each
 * streaming and failing on its own request, voted on once two or more have
 * answered.
 *
 * State lives here, not in the composer, because a turn outlives the input
 * that created it. The one subtlety is how a brand-new thread gets its first
 * turn onto the screen: `startTurn` returns before any model has been called,
 * this component navigates to `/t/[threadId]`, and the destination page loads
 * that turn's `STREAMING` rows straight from the database. The effect below,
 * which opens a stream for every `STREAMING` response, then fires on that
 * fresh page exactly the same way it fires for an in-place follow-up — one
 * mechanism for both, the database is the hand-off.
 *
 * The columns share one bordered container with rules between them rather than
 * floating as three separate cards, because three answers to one prompt are one
 * comparison, not three unrelated things.
 */

const WinnerBadge = () => (
  <span className="bg-winner/15 text-winner inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium">
    <svg viewBox="0 0 16 16" className="size-3.5" fill="currentColor" aria-hidden>
      <path d="M6.6 11.4 3.8 8.6l1.1-1.1 1.7 1.7 4.5-4.5 1.1 1.1z" />
    </svg>
    Winner
  </span>
);

type ResponseColumnProps = {
  readonly response: ResponseState;
  readonly canVote: boolean;
  readonly voting: boolean;
  readonly onVote: () => void;
  readonly onRetry: () => void;
};

const ResponseColumn = ({
  response,
  canVote,
  voting,
  onVote,
  onRetry,
}: ResponseColumnProps) => (
  <article className="border-border flex min-w-0 flex-col border-b last:border-b-0 lg:border-r lg:border-b-0 lg:last:border-r-0">
    <header className="flex items-center justify-between gap-2 px-4 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <span
          className="border-input text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-full border font-mono text-[11px]"
          aria-hidden
        >
          {response.modelName.slice(0, 1)}
        </span>
        <h3 className="font-display truncate text-base">{response.modelName}</h3>
      </div>
      {response.won ? (
        <WinnerBadge />
      ) : (
        canVote && (
          <button
            type="button"
            disabled={voting}
            onClick={onVote}
            className={cn(
              "border-input hover:bg-muted shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50",
            )}
          >
            Pick this
          </button>
        )
      )}
    </header>

    <div className="min-h-32 flex-1 px-4 pb-4">
      {response.status === "FAILED" ? (
        <div>
          <p className="text-destructive flex items-center gap-2 text-sm font-medium">
            <svg
              viewBox="0 0 16 16"
              className="size-4 shrink-0"
              fill="currentColor"
              aria-hidden
            >
              <path d="M8 1.5 15 14H1zm0 4.2a.8.8 0 0 0-.8.85l.25 3.1a.55.55 0 0 0 1.1 0l.25-3.1A.8.8 0 0 0 8 5.7m0 5.1a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6" />
            </svg>
            This model did not answer
          </p>
          <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
            The others are unaffected. Try this one again, or vote on what you have.
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="border-input hover:bg-muted mt-3 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors"
          >
            Try again
          </button>
        </div>
      ) : response.status === "STREAMING" && response.text.length === 0 ? (
        <p className="text-muted-foreground text-sm">Thinking…</p>
      ) : (
        <div className="flex flex-col gap-3 text-[15px] leading-relaxed">
          {/* Paragraphs are appended in order and never reordered, and two of
              them can genuinely open with the same words, so the position is
              the only key here that is actually unique. */}
          {response.text.split("\n\n").map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      )}
    </div>

    {response.status === "COMPLETE" && response.metrics && (
      <div className="border-border bg-background/40 border-t px-4 py-2.5">
        <InstrumentStrip metrics={response.metrics} />
      </div>
    )}
  </article>
);

type LockedModel = Readonly<{ id: string; name: string }>;

/**
 * Casting a vote is `features/voting`'s own logic, so this component never
 * imports it directly — a feature may not reach into another one. The route
 * composes the two: it imports `castVoteAction` and hands it down here.
 */
type CastVote = (input: {
  readonly turnId: string;
  readonly modelResponseId: string;
}) => Promise<{ readonly ok: boolean; readonly error?: string }>;

type ArenaScreenProps = {
  readonly catalog: readonly CatalogModel[] | null;
  readonly defaultSelection: readonly string[];
  readonly onCastVote: CastVote;
  /** `null` for a brand-new thread; the thread's own id otherwise. */
  readonly threadId?: string | null;
  /** Turns already saved for this thread, in order. Empty for a new arena. */
  readonly initialTurns?: readonly TurnState[];
  /** This thread's fixed models, derived from its own first turn. */
  readonly lockedModels?: readonly LockedModel[] | null;
  /**
   * Whether the person looking at this screen is the thread's real owner.
   * Always `true` for a brand-new thread, since whoever starts one is
   * inherently its owner. `false` hides the composer and every vote button —
   * `startTurn` and `castVote` already refuse a non-owner server-side, this
   * just agrees with that up front instead of letting a visitor try and fail.
   */
  readonly isOwner?: boolean;
};

export const ArenaScreen = ({
  catalog,
  defaultSelection,
  onCastVote,
  threadId = null,
  initialTurns = [],
  lockedModels = null,
  isOwner = true,
}: ArenaScreenProps) => {
  const router = useRouter();
  const [turns, setTurns] = useState<readonly TurnState[]>(initialTurns);
  const [pending, setPending] = useState(false);
  const [votingTurnId, setVotingTurnId] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const inFlight = useRef<Set<string>>(new Set());

  const updateResponse = (
    turnId: string,
    responseId: string,
    patch: Partial<ResponseState>,
  ) =>
    setTurns((current) =>
      current.map((turn) =>
        turn.id !== turnId
          ? turn
          : {
              ...turn,
              responses: turn.responses.map((response) =>
                response.id !== responseId ? response : { ...response, ...patch },
              ),
            },
      ),
    );

  useEffect(() => {
    // A non-owner never opened a stream, so they must never try to advance
    // one either: their own `/api/chat` call would be refused by the same
    // server-side check that already gates `startTurn` and `castVote`, and
    // that refusal would flip a genuinely in-progress answer to `FAILED` on
    // their screen for no reason but that they opened the link.
    if (!isOwner) return;

    turns.forEach((turn, turnIndex) => {
      turn.responses.forEach((response) => {
        if (response.status !== "STREAMING") return;
        if (inFlight.current.has(response.id)) return;

        inFlight.current.add(response.id);

        const messages = buildModelMessages(turns, turnIndex, response.modelId);

        streamModelAnswer({
          modelId: response.modelId,
          turnId: turn.id,
          messages,
          onTextUpdate: (text) => updateResponse(turn.id, response.id, { text }),
          onDone: (status, metrics) => {
            updateResponse(turn.id, response.id, { status, metrics });
            inFlight.current.delete(response.id);
          },
        });
      });
    });
  }, [turns, isOwner]);

  const handleSend = async (prompt: string, models: readonly LockedModel[]) => {
    setPending(true);
    setSendError(null);

    const result = await startTurn({ threadId, prompt, models });

    setPending(false);

    if (!result.ok) {
      setSendError(result.error);
      return;
    }

    if (threadId === null) {
      // The sidebar's thread list (feature 7) is read server-side in the shared
      // shell layout, which the App Router does not re-run on a plain `push` to
      // a route it has never rendered. `refresh()` forces that reread so the
      // new thread shows up without a hard reload.
      router.push(`/t/${result.threadId}`);
      router.refresh();
      return;
    }

    setTurns((current) => [
      ...current,
      {
        id: result.turnId,
        prompt,
        responses: result.responses.map((response) => ({
          id: response.id,
          modelId: response.modelId,
          modelName: response.modelName,
          status: "STREAMING" as const,
          text: "",
          metrics: null,
          won: false,
        })),
      },
    ]);

    // Same reason as above: a follow-up bumps the thread's `updatedAt`, and the
    // sidebar's recency grouping needs that reread to reflect it.
    router.refresh();
  };

  const handleVote = async (turnId: string, modelResponseId: string) => {
    setVotingTurnId(turnId);
    setSendError(null);

    const result = await onCastVote({ turnId, modelResponseId });

    setVotingTurnId(null);

    if (!result.ok) {
      setSendError(result.error ?? "That vote didn't go through. Try again.");
      return;
    }

    setTurns((current) =>
      current.map((turn) =>
        turn.id !== turnId
          ? turn
          : {
              ...turn,
              responses: turn.responses.map((response) => ({
                ...response,
                won: response.id === modelResponseId,
              })),
            },
      ),
    );
  };

  const handleRetry = (turnId: string, responseId: string) => {
    inFlight.current.delete(responseId);
    updateResponse(turnId, responseId, { status: "STREAMING", text: "" });
  };

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex-1 px-4 py-6 sm:px-6">
        {turns.length > 0 ? (
          <div className="mx-auto flex max-w-5xl flex-col gap-5">
            {turns.map((turn) => {
              const completeCount = turn.responses.filter(
                (response) => response.status === "COMPLETE",
              ).length;
              const hasVote = turn.responses.some((response) => response.won);
              const canVote = isOwner && completeCount >= 2 && !hasVote;

              return (
                <div key={turn.id} className="flex flex-col gap-5">
                  <div className="flex justify-end">
                    <p className="bg-muted max-w-xl rounded-2xl rounded-br-md px-4 py-2.5 text-[15px] leading-relaxed">
                      {turn.prompt}
                    </p>
                  </div>

                  <div className="surface overflow-hidden">
                    <div className="grid grid-cols-1 lg:grid-cols-3">
                      {turn.responses.map((response) => (
                        <ResponseColumn
                          key={response.id}
                          response={response}
                          canVote={canVote}
                          voting={votingTurnId === turn.id}
                          onVote={() => handleVote(turn.id, response.id)}
                          onRetry={() => handleRetry(turn.id, response.id)}
                        />
                      ))}
                    </div>
                  </div>

                  {canVote && (
                    <p className="text-muted-foreground text-center text-sm">
                      Two or more models answered, so this turn can be voted on. Picking
                      one marks it the winner and leaves every answer on screen.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mx-auto flex max-w-xl flex-col items-center py-20 text-center">
            <h1 className="text-display">Ask three models at once</h1>
            <p className="text-muted-foreground mt-3 text-[15px] leading-relaxed">
              One prompt goes to every model you pick. They answer side by side, each with
              its own real speed and token count, and you decide which one was actually
              worth it.
            </p>
          </div>
        )}

        {sendError && (
          <p className="text-destructive mx-auto mt-4 max-w-5xl text-center text-sm">
            {sendError}
          </p>
        )}
      </div>

      {isOwner ? (
        <Composer
          catalog={catalog}
          defaultSelection={defaultSelection}
          locked={lockedModels}
          disabled={pending}
          onSend={handleSend}
        />
      ) : (
        <p className="text-muted-foreground border-border border-t px-4 py-4 text-center text-sm sm:px-6">
          You&rsquo;re viewing someone else&rsquo;s thread. Only its owner can add to it
          or vote.
        </p>
      )}
    </div>
  );
};
