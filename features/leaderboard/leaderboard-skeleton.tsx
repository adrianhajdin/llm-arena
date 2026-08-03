import { cn } from "@/infrastructure/ui";

/**
 * The leaderboard before its standings arrive — the one wait feature 4 named
 * explicitly when it allowed skeletons at all.
 *
 * The page's own name and its column headers are rendered for real, not blocked
 * out, because neither needs the query to resolve: the moment this appears you
 * can already tell which screen you are on and what the columns will hold, and
 * only the numbers are missing. Blocking out a heading that is a single known
 * word is the thing that makes a loading state read as cheap.
 *
 * The lead paragraph is skeletoned rather than duplicated. It is real copy that
 * belongs to `leaderboard-screen.tsx`, and a second hand-maintained copy of it
 * here would drift the first time someone edited one and not the other.
 *
 * Column widths are copied from the real `<th>` set — `w-12`, auto, `w-56`,
 * `w-36`, `w-32` — expressed as a grid, because the scaffold below is
 * `aria-hidden` and a table read aloud as nothing is worse than no table at all.
 * `min-w-3xl` and the horizontal scroll match the real screen too, so the layout
 * lands identically on a narrow window.
 */
const ROWS = [0, 1, 2, 3, 4] as const;

const HEADINGS = ["#", "Model", "Win rate", "To first token", "Speed"] as const;

/** `w-12 / auto / w-56 / w-36 / w-32`, the real table's own column widths. */
const columns = "grid grid-cols-[3rem_1fr_14rem_9rem_8rem] items-center";

export const LeaderboardSkeleton = () => (
  <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6" aria-busy="true">
    <h1 className="text-display">Leaderboard</h1>

    <p role="status" className="sr-only">
      Loading the standings
    </p>

    <div aria-hidden>
      <div className="mt-4 flex max-w-xl flex-col gap-2.5">
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-11/12" />
      </div>

      {/* The Everyone/Personal toggle, at its real size. */}
      <div className="border-border mt-6 inline-flex gap-1 rounded-full border p-0.5">
        <div className="skeleton h-8 w-24 rounded-full" />
        <div className="skeleton h-8 w-16 rounded-full" />
      </div>

      <div className="surface mt-6 overflow-x-auto">
        <div className="min-w-3xl">
          <div className={cn(columns, "border-border border-b")}>
            {HEADINGS.map((heading) => (
              <div key={heading} className="text-eyebrow px-4 py-2.5">
                {heading}
              </div>
            ))}
          </div>

          {ROWS.map((row) => (
            <div
              key={row}
              className={cn(columns, "border-border border-b last:border-b-0")}
            >
              <div className="px-4 py-3.5">
                <div className="skeleton h-4 w-4" />
              </div>
              <div className="flex items-center gap-2.5 px-4 py-3.5">
                <div className="skeleton size-7 shrink-0 rounded-full" />
                <div className="skeleton h-5 w-40" />
              </div>
              {/* Win rate is two stacked things in the real row: the percentage
                  beside its "won N of M", then the bar under both. */}
              <div className="px-4 py-3.5">
                <div className="skeleton h-6 w-28" />
                <div className="skeleton mt-1.5 h-1 w-full max-w-40 rounded-full" />
              </div>
              <div className="px-4 py-3.5">
                <div className="skeleton h-4 w-16" />
              </div>
              <div className="px-4 py-3.5">
                <div className="skeleton h-4 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);
