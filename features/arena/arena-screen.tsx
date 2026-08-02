import { cn } from "@/infrastructure/ui";

import { InstrumentStrip } from "./instrument-strip";
import {
  PLACEHOLDER_PROMPT,
  PLACEHOLDER_RESPONSES,
  type PlaceholderResponse,
} from "./placeholder-turn";

/**
 * PLACEHOLDER SCREEN — the frame is real, everything inside it is not. Feature 5
 * replaces the model chips with the live catalog, feature 6 replaces the columns
 * with real streams and makes the composer and the vote buttons work.
 *
 * The columns share one bordered container with rules between them rather than
 * floating as three separate cards, because three answers to one prompt are one
 * comparison, not three unrelated things.
 *
 * Metrics sit open under every answer instead of behind the sketch's toggle.
 * The measured numbers are the reason this product exists, and hiding the best
 * thing on the screen behind a disclosure was the wrong read of that sketch.
 */

const SELECTED_MODELS = ["Phi 4 Reasoning", "Qwen 3 Coder", "Nemotron 3 Ultra"] as const;

const WinnerBadge = () => (
  <span className="bg-winner/15 text-winner inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium">
    <svg viewBox="0 0 16 16" className="size-3.5" fill="currentColor" aria-hidden>
      <path d="M6.6 11.4 3.8 8.6l1.1-1.1 1.7 1.7 4.5-4.5 1.1 1.1z" />
    </svg>
    Winner
  </span>
);

const ResponseColumn = ({ response }: { readonly response: PlaceholderResponse }) => (
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
        <button
          type="button"
          disabled={response.status === "FAILED"}
          className={cn(
            "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
            response.status === "FAILED"
              ? "border-border text-muted-foreground opacity-50"
              : "border-input hover:bg-muted",
          )}
        >
          Pick this
        </button>
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
            className="border-input hover:bg-muted mt-3 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors"
          >
            Try again
          </button>
        </div>
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

    {response.status === "COMPLETE" && (
      <div className="border-border bg-background/40 border-t px-4 py-2.5">
        <InstrumentStrip />
      </div>
    )}
  </article>
);

const Composer = () => (
  <div className="bg-background/85 sticky bottom-0 px-4 pt-2 pb-4 backdrop-blur-sm sm:px-6">
    <div className="surface mx-auto max-w-5xl p-3">
      <label htmlFor="prompt" className="sr-only">
        Your prompt
      </label>
      <textarea
        id="prompt"
        rows={2}
        placeholder="Ask anything. Enter to send, shift + enter for a new line."
        className="placeholder:text-muted-foreground w-full resize-none bg-transparent px-1 py-1 text-[15px] leading-relaxed outline-none"
      />
      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {SELECTED_MODELS.map((model) => (
            <span
              key={model}
              className="border-border text-muted-foreground inline-flex items-center gap-1.5 rounded-full border py-1 pr-1.5 pl-2.5 text-xs"
            >
              {model}
              <button
                type="button"
                className="hover:text-foreground rounded-full p-0.5 transition-colors"
                aria-label={`Remove ${model}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  aria-hidden
                >
                  <path d="m6 6 12 12M18 6 6 18" />
                </svg>
              </button>
            </span>
          ))}
          <button
            type="button"
            className="border-input hover:bg-muted rounded-full border px-2.5 py-1 text-xs font-medium transition-colors"
          >
            Add model
          </button>
        </div>
        <button
          type="button"
          className="bg-primary text-primary-foreground hover:bg-primary/90 flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors"
          aria-label="Send prompt"
        >
          <svg
            viewBox="0 0 24 24"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </button>
      </div>
    </div>
    <p className="text-muted-foreground mx-auto mt-2 max-w-5xl text-center text-xs">
      Up to three models at a time. Every one of them is free.
    </p>
  </div>
);

export const ArenaScreen = ({ withTurn = false }: { readonly withTurn?: boolean }) => (
  <div className="flex min-h-full flex-col">
    <div className="flex-1 px-4 py-6 sm:px-6">
      {withTurn ? (
        <div className="mx-auto flex max-w-5xl flex-col gap-5">
          <div className="flex justify-end">
            <p className="bg-muted max-w-xl rounded-2xl rounded-br-md px-4 py-2.5 text-[15px] leading-relaxed">
              {PLACEHOLDER_PROMPT}
            </p>
          </div>

          <div className="surface overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-3">
              {PLACEHOLDER_RESPONSES.map((response) => (
                <ResponseColumn key={response.modelId} response={response} />
              ))}
            </div>
          </div>

          <p className="text-muted-foreground text-center text-sm">
            Two models answered, so this turn can be voted on. Picking one marks it the
            winner and leaves every answer on screen.
          </p>
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
    </div>

    <Composer />
  </div>
);
