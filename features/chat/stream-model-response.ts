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
 * The metrics are computed exactly once, in `messageMetadata` below, and
 * `onFinish` only reads that same value back — not the other way around. That
 * ordering is forced, not stylistic: `streamText`'s own `onFinish` runs inside
 * the underlying stream's `flush()`, which only fires once every part has
 * already been forwarded downstream, while `messageMetadata` reads the
 * `"finish"` part as it passes through on its way to the client. Computing
 * metrics inside `onFinish` and hoping `messageMetadata` would still see them
 * — this function's original shape — meant the client's `"finish"` chunk
 * always went out carrying no metadata at all: measured live, the browser
 * never saw a single metric until a reload re-read them from the database.
 * Computing them in `messageMetadata` first guarantees they exist by the time
 * `onFinish` reads the same variable a moment later, so the client sees them
 * the instant its own stream ends, in step with the answer finishing, not
 * after a round trip through the database.
 *
 * A model that errors writes `FAILED` from the same `onError` path that
 * already turns the failure into the sentence the client shows.
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
    onFinish: async ({ text }) => {
      if (!metrics) {
        // Should not happen: `messageMetadata` computes this from the same
        // "finish" part before this callback ever runs. Guarded rather than
        // asserted so a future SDK change that breaks that ordering fails
        // loudly here instead of writing bad numbers to the database.
        console.error(`[chat] ${modelId} finished with no metrics computed yet`);
        return;
      }

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
    messageMetadata: ({ part }) => {
      if (part.type !== "finish") return undefined;

      metrics = timer.read({
        inputTokens: part.totalUsage.inputTokens,
        outputTokens: part.totalUsage.outputTokens,
        totalTokens: part.totalUsage.totalTokens,
      });

      return metrics;
    },
    onError: () =>
      "This model didn't come back. You can try it again, the others aren't affected.",
  });
};
