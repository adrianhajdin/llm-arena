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
  /**
   * True only for the fraction of a second between a prompt being submitted and
   * `startTurn` coming back with the real row ids. Such a turn is on screen —
   * the prompt in its bubble, every column reading "Thinking…", which is
   * honestly what is happening — but its ids are placeholders, so nothing may
   * open a stream against it yet. The streaming effect skips it for exactly
   * that reason, and it is replaced wholesale, never patched, the moment the
   * real ids arrive.
   *
   * Absent on every turn loaded from the database, which by definition has real
   * ids already.
   */
  optimistic?: boolean;
}>;
