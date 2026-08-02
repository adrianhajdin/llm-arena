import "server-only";

import { posthogServer } from "@/infrastructure/posthog";

/**
 * The honest funnel scope.md asks for: a prompt sent, an answer finishing (or
 * not), and a vote cast. Kept separate from `@posthog/ai`'s own per-call
 * capture in `stream-model-response.ts`, which is PostHog's LLM analytics
 * (tokens, cost, latency for the call itself), not this funnel.
 */

export const trackPromptSent = (params: {
  readonly clerkId: string;
  readonly threadId: string;
  readonly turnId: string;
  readonly modelIds: readonly string[];
}): void => {
  posthogServer().capture({
    distinctId: params.clerkId,
    event: "prompt_sent",
    properties: {
      threadId: params.threadId,
      turnId: params.turnId,
      modelIds: params.modelIds,
      modelCount: params.modelIds.length,
    },
  });
};

export const trackModelAnswered = (params: {
  readonly clerkId: string;
  readonly turnId: string;
  readonly modelId: string;
  readonly status: "COMPLETE" | "FAILED";
}): void => {
  posthogServer().capture({
    distinctId: params.clerkId,
    event: "model_answered",
    properties: {
      turnId: params.turnId,
      modelId: params.modelId,
      status: params.status,
    },
  });
};

export const trackVoteCast = (params: {
  readonly clerkId: string;
  readonly turnId: string;
  readonly modelResponseId: string;
}): void => {
  posthogServer().capture({
    distinctId: params.clerkId,
    event: "vote_cast",
    properties: {
      turnId: params.turnId,
      modelResponseId: params.modelResponseId,
    },
  });
};
