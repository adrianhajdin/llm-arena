import "server-only";

import { captureAiGeneration } from "@posthog/ai";
import { streamText } from "ai";

import {
  type ChatUIMessage,
  createResponseTimer,
  type ModelResponseMetrics,
} from "@/infrastructure/model-response-metrics";
import { trackModelAnswered } from "@/infrastructure/analytics-events";
import { posthogServer } from "@/infrastructure/posthog";

import type { ChatRequest } from "./chat-request";
import {
  markModelResponseComplete,
  markModelResponseFailed,
} from "./persist-model-response";
import { openrouter } from "./openrouter";

/**
 * Streams one model's answer back to the browser.
 *
 * One call, one model, one connection. That is the decision recorded in
 * docs/scope.md: routing all three models through a single shared stream would
 * be less code, but one dropped connection would then kill all three answers
 * at once, which is exactly the failure this product is supposed to make
 * impossible.
 *
 * The metrics computed at finish are written into the `ModelResponse` row
 * `startTurn` already created, and handed back as the same object on
 * `messageMetadata` — one measured value, not two estimates that can drift. A
 * model that errors writes `FAILED` from the same `onError` path that already
 * turns the failure into the sentence the client shows.
 *
 * PostHog's own LLM analytics (tokens, cost, latency for the call itself) is
 * captured by hand with `captureAiGeneration` rather than `withTracing`
 * wrapping the model: `withTracing` expects the AI SDK's older
 * `LanguageModelV2`/`V3` shape, and `@openrouter/ai-sdk-provider` has already
 * moved on to `V4`. Calling it directly sidesteps that mismatch entirely and
 * reuses the exact same measured numbers already going into `metrics`.
 */
export const streamModelResponse = (
  { modelId, turnId, messages }: ChatRequest,
  { clerkId }: { readonly clerkId: string },
): Response => {
  const timer = createResponseTimer(modelId);
  let metrics: ModelResponseMetrics | null = null;

  const result = streamText({
    model: openrouter()(modelId),
    messages: messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
    onChunk: ({ chunk }) => {
      if (chunk.type === "text-delta") timer.markFirstToken();
    },
    onFinish: async ({ text, usage }) => {
      metrics = timer.read({
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        totalTokens: usage.totalTokens,
      });

      await markModelResponseComplete({ turnId, modelId, text, metrics });
      trackModelAnswered({ clerkId, turnId, modelId, status: "COMPLETE" });

      await captureAiGeneration(posthogServer(), {
        distinctId: clerkId,
        provider: "openrouter",
        model: modelId,
        input: messages,
        output: text,
        latency:
          metrics.timeToFirstTokenMs === null
            ? undefined
            : metrics.timeToFirstTokenMs / 1000,
        usage: {
          inputTokens: metrics.inputTokens ?? undefined,
          outputTokens: metrics.outputTokens ?? undefined,
        },
        properties: { turnId },
      }).catch((error: unknown) => {
        console.error(`[chat] failed to capture ai generation for ${modelId}`, error);
      });
    },
    onError: async ({ error }) => {
      // The user gets a plain sentence from the client; the real error belongs
      // in the server log, not on screen and not silently dropped.
      console.error(`[chat] model ${modelId} failed`, error);

      await markModelResponseFailed({ turnId, modelId }).catch((dbError: unknown) => {
        console.error(`[chat] failed to record ${modelId} as failed`, dbError);
      });

      trackModelAnswered({ clerkId, turnId, modelId, status: "FAILED" });
    },
  });

  return result.toUIMessageStreamResponse<ChatUIMessage>({
    messageMetadata: ({ part }) =>
      part.type === "finish" && metrics ? metrics : undefined,
    onError: () =>
      "This model didn't come back. You can try it again, the others aren't affected.",
  });
};
