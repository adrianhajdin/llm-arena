"use client";

import { useEffect, useState } from "react";

import { cn } from "@/infrastructure/ui";

/**
 * The signature element, shown here settling on a loop so it can actually be
 * looked at. In the real arena these values arrive from the stream instead: a
 * metric is dim until it has genuinely been measured, then settles to full
 * contrast, and every figure is tabular so nothing shifts sideways while the
 * rest of the row is still filling in.
 */
const READINGS = [
  { label: "first token", value: "982 ms", settlesAt: 3 },
  { label: "speed", value: "18.71 tok/s", settlesAt: 8 },
  { label: "tokens", value: "397", settlesAt: 8 },
  { label: "cost", value: "$0.0000", settlesAt: 8 },
] as const;

const CYCLE_TICKS = 16;
const TICK_MS = 220;

export const InstrumentStrip = () => {
  const [tick, setTick] = useState(CYCLE_TICKS);

  useEffect(() => {
    const stillPreferred = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (stillPreferred.matches) return;

    const timer = setInterval(
      () => setTick((current) => (current + 1) % CYCLE_TICKS),
      TICK_MS,
    );
    return () => clearInterval(timer);
  }, []);

  return (
    <dl className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
      {READINGS.map((reading) => {
        const measured = tick >= reading.settlesAt;
        return (
          <div key={reading.label} className="flex items-baseline gap-1.5">
            <dt className="metric">{reading.label}</dt>
            <dd className={cn("metric", measured ? "metric-value" : "metric-pending")}>
              {measured ? reading.value : "—"}
            </dd>
          </div>
        );
      })}
    </dl>
  );
};
