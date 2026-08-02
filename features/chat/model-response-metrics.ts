/**
 * The real, measured numbers for a single model's answer.
 *
 * These travel back inside the stream itself so the number rendered on a
 * response card and the number eventually written to the database are the same
 * measured value, never two independent estimates that can drift apart.
 */
export type ModelResponseMetrics = Readonly<{
  modelId: string;
  /** Wall-clock milliseconds from request start to the first token of text. */
  timeToFirstTokenMs: number | null;
  /** Output tokens divided by the whole call's wall-clock duration. */
  tokensPerSecond: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  /**
   * Always 0. Every model in this arena is free tier, so this is an honestly
   * measured zero rather than a missing number, and it is shown as such.
   */
  costUsd: number;
}>;

type UsageSnapshot = Readonly<{
  inputTokens: number | undefined;
  outputTokens: number | undefined;
  totalTokens: number | undefined;
}>;

/**
 * A stopwatch for one model call.
 *
 * Timing is the one genuinely stateful thing in this path, so it is sealed
 * inside a closure and handed out as two small functions instead of being left
 * as loose mutable variables for the route to manage.
 */
export type ResponseTimer = Readonly<{
  markFirstToken: () => void;
  read: (usage: UsageSnapshot) => ModelResponseMetrics;
}>;

const roundTo = (value: number, decimals: number): number =>
  Number(value.toFixed(decimals));

const toTokensPerSecond = (
  outputTokens: number | undefined,
  elapsedMs: number,
): number | null => {
  if (outputTokens === undefined || elapsedMs <= 0) return null;

  return roundTo(outputTokens / (elapsedMs / 1000), 2);
};

export const createResponseTimer = (
  modelId: string,
  now: () => number = () => performance.now(),
): ResponseTimer => {
  const startedAt = now();
  let firstTokenAt: number | null = null;

  return Object.freeze({
    markFirstToken: (): void => {
      // Only the first delta counts; every later one is ignored.
      firstTokenAt ??= now();
    },
    read: (usage: UsageSnapshot): ModelResponseMetrics => {
      const finishedAt = now();
      const timeToFirstTokenMs =
        firstTokenAt === null ? null : Math.round(firstTokenAt - startedAt);

      // Measured across the whole call, request to finish, not just the
      // generating window. Some providers stream token by token while others
      // buffer the answer and flush it in one go, and against a buffered
      // response the generating window collapses to a few milliseconds and
      // reports absurd speeds (a real measurement here read 23,550 tok/s).
      // Wall clock is the only figure that stays honest across both and can
      // actually be compared on the leaderboard. It includes the initial wait,
      // which is fine: TTFT is reported separately, right next to it.
      const elapsedMs = finishedAt - startedAt;

      return Object.freeze({
        modelId,
        timeToFirstTokenMs,
        tokensPerSecond: toTokensPerSecond(usage.outputTokens, elapsedMs),
        inputTokens: usage.inputTokens ?? null,
        outputTokens: usage.outputTokens ?? null,
        totalTokens: usage.totalTokens ?? null,
        costUsd: 0,
      });
    },
  });
};
