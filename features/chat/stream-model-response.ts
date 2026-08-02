import "server-only";

import { streamText, type UIMessage } from "ai";

import type { ChatRequest } from "./chat-request";
import { createResponseTimer, type ModelResponseMetrics } from "./model-response-metrics";
import { openrouter } from "./openrouter";

/**
 * The message shape the browser receives, carrying the measured metrics as
 * message metadata on the final chunk.
 */
export type ChatUIMessage = UIMessage<ModelResponseMetrics>;

/**
 * Streams one model's answer back to the browser.
 *
 * One call, one model, one connection. That is the decision recorded in
 * docs/scope.md: routing all three models through a single shared stream would
 * be less code, but one dropped connection would then kill all three answers
 * at once, which is exactly the failure this product is supposed to make
 * impossible.
 */
export const streamModelResponse = ({ modelId, messages }: ChatRequest): Response => {
  const timer = createResponseTimer(modelId);

  const result = streamText({
    model: openrouter()(modelId),
    messages: messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
    onChunk: ({ chunk }) => {
      if (chunk.type === "text-delta") timer.markFirstToken();
    },
    onError: ({ error }) => {
      // The user gets a plain sentence from the client; the real error belongs
      // in the server log, not on screen and not silently dropped.
      console.error(`[chat] model ${modelId} failed`, error);
    },
  });

  return result.toUIMessageStreamResponse<ChatUIMessage>({
    messageMetadata: ({ part }) =>
      part.type === "finish"
        ? timer.read({
            inputTokens: part.totalUsage.inputTokens,
            outputTokens: part.totalUsage.outputTokens,
            totalTokens: part.totalUsage.totalTokens,
          })
        : undefined,
    onError: () =>
      "This model didn't come back. You can try it again, the others aren't affected.",
  });
};
