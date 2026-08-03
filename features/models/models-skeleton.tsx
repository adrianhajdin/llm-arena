import { cn } from "@/infrastructure/ui";

/**
 * The models list before the catalog arrives. Same reasoning as the leaderboard's
 * skeleton: the page name and the column headers are known without the network,
 * so they render for real, and only what OpenRouter has to answer for is blocked
 * out.
 *
 * The row count is a guess and is allowed to be. The real catalog is however many
 * free models exist that day, so no count is correct — five rows is enough to read
 * as a list without pretending to a length.
 */
const ROWS = [0, 1, 2, 3, 4] as const;

/**
 * `Model / Per call / Context`, matching the real table: the middle column is
 * `hidden sm:table-cell` and the last is `w-32 sm:w-48`.
 */
const columns = "grid grid-cols-[1fr_8rem] sm:grid-cols-[1fr_6rem_12rem] items-center";

export const ModelsSkeleton = () => (
  <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6" aria-busy="true">
    <h1 className="text-display">Models</h1>

    <p role="status" className="sr-only">
      Loading the model list
    </p>

    <div aria-hidden>
      <div className="mt-5 flex max-w-xl flex-col gap-2.5">
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-3/4" />
      </div>

      {/* The mono summary line: "N models · X widest window · $0.0000 each". */}
      <div className="skeleton mt-5 h-4 w-80" />

      <div className="surface mt-6 overflow-hidden">
        <div className={cn(columns, "border-border border-b")}>
          <div className="text-eyebrow px-4 py-2.5 font-medium">Model</div>
          <div className="text-eyebrow hidden px-4 py-2.5 text-right font-medium sm:block">
            Per call
          </div>
          <div className="text-eyebrow px-4 py-2.5 text-right font-medium">Context</div>
        </div>

        {ROWS.map((row) => (
          <div
            key={row}
            className={cn(columns, "border-border border-b last:border-b-0")}
          >
            <div className="flex min-w-0 items-center gap-3 px-4 py-3.5">
              <div className="skeleton size-8 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1">
                <div className="skeleton h-5 w-44" />
                <div className="skeleton mt-1.5 h-3 w-56" />
              </div>
            </div>
            <div className="hidden px-4 py-3.5 sm:flex sm:justify-end">
              <div className="skeleton h-4 w-14" />
            </div>
            {/* The context figure, then its measure bar drawn under it. */}
            <div className="px-4 py-3.5">
              <div className="skeleton ml-auto h-4 w-16" />
              <div className="skeleton mt-2 h-1 w-full rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);
