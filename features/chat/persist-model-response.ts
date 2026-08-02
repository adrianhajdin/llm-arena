import "server-only";

import { database } from "@/infrastructure/database";
import type { ModelResponseMetrics } from "@/infrastructure/model-response-metrics";

/**
 * Writes the same measured value the browser is shown, from the same place it
 * was measured, into the `ModelResponse` row `startTurn` already created for
 * this model. Both functions update, never create: the unique
 * `[turnId, modelId]` row is guaranteed to already exist, including on a
 * retry, which is exactly what turns a retry into an overwrite instead of a
 * second answer.
 */

export const markModelResponseComplete = async (params: {
  readonly turnId: string;
  readonly modelId: string;
  readonly text: string;
  readonly metrics: ModelResponseMetrics;
}): Promise<void> => {
  await database().modelResponse.update({
    where: { turnId_modelId: { turnId: params.turnId, modelId: params.modelId } },
    data: {
      text: params.text,
      status: "COMPLETE",
      timeToFirstTokenMs: params.metrics.timeToFirstTokenMs,
      tokensPerSecond: params.metrics.tokensPerSecond,
      inputTokens: params.metrics.inputTokens,
      outputTokens: params.metrics.outputTokens,
      totalTokens: params.metrics.totalTokens,
      completedAt: new Date(),
    },
  });
};

export const markModelResponseFailed = async (params: {
  readonly turnId: string;
  readonly modelId: string;
}): Promise<void> => {
  await database().modelResponse.update({
    where: { turnId_modelId: { turnId: params.turnId, modelId: params.modelId } },
    data: { status: "FAILED", completedAt: new Date() },
  });
};
