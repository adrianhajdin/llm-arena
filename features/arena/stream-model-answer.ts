import { parseJsonEventStream, readUIMessageStream, uiMessageChunkSchema } from "ai";

import type { ChatUIMessage } from "@/infrastructure/model-response-metrics";

import type { PlainMessage } from "./model-messages";

/**
 * One model's own request, parsed by hand rather than through `@ai-sdk/react`'s
 * `useChat`: three independent per-model streams, each carrying its own
 * measured metrics as message metadata, don't fit that hook's single
 * conversation model any better than the pieces already hand-rolled in
 * `model-response-metrics.ts`, and it isn't worth a second AI SDK entry point
 * for one hook.
 *
 * `parseJsonEventStream` turns the response body's SSE bytes into
 * `UIMessageChunk`s, and `readUIMessageStream` turns those into the one
 * assistant message being built, over and over, as it fills in.
 */
export type StreamOutcome = "COMPLETE" | "FAILED";

const extractText = (message: ChatUIMessage): string =>
  message.parts.reduce(
    (text, part) => (part.type === "text" ? text + part.text : text),
    "",
  );

export const streamModelAnswer = async (params: {
  readonly modelId: string;
  readonly turnId: string;
  readonly messages: readonly PlainMessage[];
  readonly onTextUpdate: (text: string) => void;
  readonly onDone: (status: StreamOutcome) => void;
}): Promise<void> => {
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        modelId: params.modelId,
        turnId: params.turnId,
        messages: params.messages,
      }),
    });

    if (!response.ok || !response.body) {
      params.onDone("FAILED");
      return;
    }

    const chunkStream = parseJsonEventStream({
      stream: response.body,
      schema: uiMessageChunkSchema,
    }).pipeThrough(
      new TransformStream({
        transform(result, controller) {
          if (result.success) controller.enqueue(result.value);
        },
      }),
    );

    let failed = false;

    const messageStream = readUIMessageStream<ChatUIMessage>({
      stream: chunkStream,
      onError: () => {
        failed = true;
      },
    });

    for await (const message of messageStream) {
      params.onTextUpdate(extractText(message));
    }

    params.onDone(failed ? "FAILED" : "COMPLETE");
  } catch (error) {
    console.error(`[arena] lost the stream for ${params.modelId}`, error);
    params.onDone("FAILED");
  }
};
