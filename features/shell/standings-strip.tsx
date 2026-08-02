import { cn } from "@/infrastructure/ui";

import { type ModelStanding } from "./placeholder-standings";

/**
 * The shell's signature element: a running scorecard pinned to the top of the
 * venue, one chip per model in this thread.
 *
 * Deliberately not accented. Rust means "you can operate this" everywhere else
 * in the app, and a standing is a reading, not a control. It earns attention
 * through form instead: the model's initial in a ring, its record in tabular
 * mono. Below `xl` the name drops and the chip becomes the ring and the number,
 * which is the shrink the feature description asked for.
 */
export const StandingsStrip = ({
  standings,
  className,
}: {
  readonly standings: readonly ModelStanding[];
  readonly className?: string;
}) => {
  if (standings.length === 0) return null;

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <h2 className="sr-only">Model records in this thread</h2>
      {standings.map((standing) => (
        <div
          key={standing.modelId}
          className="border-border bg-card flex items-center gap-1.5 rounded-full border py-1 pr-2.5 pl-1"
        >
          <span
            className="border-input text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-full border font-mono text-[11px] uppercase"
            aria-hidden
          >
            {standing.shortName.slice(0, 1)}
          </span>
          <span className="text-muted-foreground hidden max-w-32 truncate text-xs xl:inline">
            {standing.shortName}
          </span>
          <span className="font-mono text-xs">
            <span className="sr-only">{standing.shortName}, won </span>
            {standing.won}
            <span className="text-muted-foreground">/{standing.of}</span>
          </span>
        </div>
      ))}
    </div>
  );
};
