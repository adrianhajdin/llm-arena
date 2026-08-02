import { z } from "zod";

/**
 * The body of a single `POST /api/chat` call.
 *
 * One request carries exactly one model. Three models answering the same
 * prompt means three of these, sent in parallel from the browser, so a model
 * that fails or hangs takes nothing else down with it.
 */
export const chatRequestSchema = z.object({
  modelId: z.string().min(1).max(200),
  /** The turn this call's answer belongs to, already created by `startTurn`. */
  turnId: z.string().min(1),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(32_000),
      }),
    )
    .min(1)
    .max(100),
});

export type ChatRequest = Readonly<z.infer<typeof chatRequestSchema>>;
