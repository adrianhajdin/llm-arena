import type { ModelResponseMetrics } from "@/infrastructure/model-response-metrics";

/**
 * What the browser holds for one turn, whether it just arrived from
 * `startTurn` (responses still `STREAMING`, no text yet) or was loaded from
 * the database for a saved thread (already `COMPLETE` or `FAILED`, text and
 * metrics already measured).
 */
export type ResponseState = Readonly<{
  id: string;
  modelId: string;
  modelName: string;
  status: "STREAMING" | "COMPLETE" | "FAILED";
  text: string;
  metrics: ModelResponseMetrics | null;
  won: boolean;
}>;

export type TurnState = Readonly<{
  id: string;
  prompt: string;
  responses: readonly ResponseState[];
}>;
