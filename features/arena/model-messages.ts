import type { TurnState } from "./turn-state";

export type PlainMessage = Readonly<{ role: "user" | "assistant"; content: string }>;

/**
 * One model's own conversation, rebuilt from the thread's turns rather than
 * carried as separate state. Every prompt goes in; a prior turn's answer from
 * this specific model goes in only where it actually completed, so one model
 * never sees another model's text, and a turn where this model failed simply
 * has no assistant line, not a broken one.
 *
 * `uptoIndex` is inclusive: the prompt of the turn currently being answered is
 * included, its answer is not (that is what is being generated).
 */
export const buildModelMessages = (
  turns: readonly TurnState[],
  uptoIndex: number,
  modelId: string,
): readonly PlainMessage[] =>
  turns.slice(0, uptoIndex + 1).flatMap((turn, index): readonly PlainMessage[] => {
    const prompt: PlainMessage = { role: "user", content: turn.prompt };

    if (index === uptoIndex) return [prompt];

    const answer = turn.responses.find(
      (response) => response.modelId === modelId && response.status === "COMPLETE",
    );

    return answer ? [prompt, { role: "assistant", content: answer.text }] : [prompt];
  });
