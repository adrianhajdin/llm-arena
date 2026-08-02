import type { ModelResponseMetrics } from "@/infrastructure/model-response-metrics";
import { cn } from "@/infrastructure/ui";

/**
 * The signature element: the real, measured numbers for one answer. Every
 * model here is free tier, so cost reads a genuine, measured $0.0000, not a
 * placeholder, and it is shown rather than hidden for reading zero.
 */
type Reading = { readonly label: string; readonly value: string | null };

const readingsFor = (metrics: ModelResponseMetrics): readonly Reading[] => [
  {
    label: "first token",
    value:
      metrics.timeToFirstTokenMs === null ? null : `${metrics.timeToFirstTokenMs} ms`,
  },
  {
    label: "speed",
    value: metrics.tokensPerSecond === null ? null : `${metrics.tokensPerSecond} tok/s`,
  },
  {
    label: "tokens",
    value: metrics.totalTokens === null ? null : `${metrics.totalTokens}`,
  },
  { label: "cost", value: `$${metrics.costUsd.toFixed(4)}` },
];

export const InstrumentStrip = ({
  metrics,
}: {
  readonly metrics: ModelResponseMetrics;
}) => (
  <dl className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
    {readingsFor(metrics).map((reading) => (
      <div key={reading.label} className="flex items-baseline gap-1.5">
        <dt className="metric">{reading.label}</dt>
        <dd className={cn("metric", reading.value ? "metric-value" : "metric-pending")}>
          {reading.value ?? "—"}
        </dd>
      </div>
    ))}
  </dl>
);
