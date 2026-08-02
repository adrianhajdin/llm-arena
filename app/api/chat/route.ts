import { auth } from "@clerk/nextjs/server";

import { chatRequestSchema } from "@/features/chat/chat-request";
import { guardChatRequest } from "@/features/chat/chat-protection";
import { streamModelResponse } from "@/features/chat/stream-model-response";

/**
 * One model per request, on purpose.
 *
 * The browser sends one of these per selected model, in parallel, so each
 * answer streams and fails on its own connection.
 *
 * Sign-in is required before anything else runs. The rate limit is a limit on
 * a person, not on an endpoint, and without a Clerk user there is no honest
 * identity to key it on. Rejecting here also means an unauthenticated request
 * never costs an Arcjet decision.
 */
export const POST = async (request: Request): Promise<Response> => {
  const { userId } = await auth();

  if (!userId) {
    return Response.json(
      { error: "Sign in to send a prompt to the arena." },
      { status: 401 },
    );
  }

  const blocked = await guardChatRequest(request, userId);

  if (blocked) {
    return blocked;
  }

  const payload = await request.json().catch(() => null);
  const parsed = chatRequestSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json(
      { error: "That request didn't look right. Try sending your prompt again." },
      { status: 400 },
    );
  }

  try {
    return streamModelResponse(parsed.data);
  } catch (error) {
    console.error("[chat] failed to start the model stream", error);

    return Response.json(
      { error: "We couldn't reach that model just now. Give it another try." },
      { status: 502 },
    );
  }
};
