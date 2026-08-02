import { cn } from "@/infrastructure/ui";

import { PLACEHOLDER_ROWS } from "./placeholder-standings";

/**
 * PLACEHOLDER SCREEN — feature 9 replaces the rows with the real query and makes
 * the Global / Personal toggle work.
 *
 * Rank numbers earn their place here in a way the sidebar's thread list does not:
 * on a leaderboard, order _is_ the content. The win rate is written as "won 507
 * of 700" beside the percentage, never as a bare percentage and never as an
 * invented score, so a model with three votes cannot look like one with seven
 * hundred. No cost column: every model here is free, so the number would say
 * nothing.
 */

const WinRate = ({ won, of }: { readonly won: number; readonly of: number }) => {
  const pct = Math.round((won / of) * 100);
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="text-primary font-mono text-2xl font-medium">{pct}%</span>
        <span className="metric">
          won {won} of {of}
        </span>
      </div>
      <div className="bg-muted mt-1.5 h-1 w-full max-w-40 overflow-hidden rounded-full">
        <div className="bg-primary h-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

export const LeaderboardScreen = () => (
  <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
    <h1 className="text-display">Leaderboard</h1>
    <p className="text-muted-foreground mt-2 max-w-xl text-[15px] leading-relaxed">
      Every model&rsquo;s real record, from actual head-to-head votes. No benchmark, no
      vendor claim, just what people picked when they saw the answers side by side.
    </p>

    <div
      role="group"
      aria-label="Which votes to count"
      className="border-border mt-6 inline-flex rounded-full border p-0.5"
    >
      <button
        type="button"
        aria-pressed="true"
        className="bg-muted rounded-full px-3.5 py-1.5 text-sm font-medium"
      >
        Everyone
      </button>
      <button
        type="button"
        aria-pressed="false"
        className="text-muted-foreground hover:text-foreground rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors"
      >
        Just me
      </button>
    </div>

    <div className="surface mt-6 overflow-x-auto">
      <table className="w-full min-w-3xl border-collapse">
        <caption className="sr-only">
          Models ranked by win rate, with average speed measured per call
        </caption>
        <thead>
          <tr className="border-border border-b">
            <th scope="col" className="text-eyebrow w-12 px-4 py-2.5 text-left">
              #
            </th>
            <th scope="col" className="text-eyebrow px-4 py-2.5 text-left">
              Model
            </th>
            <th scope="col" className="text-eyebrow w-56 px-4 py-2.5 text-left">
              Win rate
            </th>
            <th scope="col" className="text-eyebrow w-36 px-4 py-2.5 text-left">
              To first token
            </th>
            <th scope="col" className="text-eyebrow w-32 px-4 py-2.5 text-left">
              Speed
            </th>
          </tr>
        </thead>
        <tbody>
          {PLACEHOLDER_ROWS.map((row, index) => (
            <tr
              key={row.modelId}
              className={cn(
                "border-border border-b last:border-b-0",
                index === 0 && "bg-muted/40",
              )}
            >
              <td className="px-4 py-3.5 font-mono text-sm">{index + 1}</td>
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-2.5">
                  <span
                    className="border-input text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-full border font-mono text-xs"
                    aria-hidden
                  >
                    {row.modelName.slice(0, 1)}
                  </span>
                  <span className="font-display text-lg">{row.modelName}</span>
                </div>
              </td>
              <td className="px-4 py-3.5">
                <WinRate won={row.won} of={row.of} />
              </td>
              <td className="metric metric-value px-4 py-3.5">
                {row.avgFirstTokenMs} ms
              </td>
              <td className="metric metric-value px-4 py-3.5">
                {row.avgTokensPerSecond.toFixed(1)} tok/s
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
      Speed is wall clock, request to finish, so a model that buffers its whole answer and
      a model that streams token by token can sit in the same column honestly. Time to
      first token is measured separately and shown beside it.
    </p>
  </div>
);
