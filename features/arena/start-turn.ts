"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

import { trackPromptSent } from "@/infrastructure/analytics-events";
import { MAX_SELECTED_MODELS, MIN_SELECTED_MODELS } from "@/infrastructure/model-catalog";
import { database } from "@/infrastructure/database";
import { ensureAppUser } from "@/infrastructure/current-user";

/**
 * The durable record a prompt becomes, created before any model is ever
 * called: the thread (if new), the turn, and one `STREAMING` `ModelResponse`
 * row per model. The browser learns the model streams exist only after this
 * comes back, and the app's own free-tier free-form catalog is the only thing
 * the browser ever sent — the models a thread actually runs are read back out
 * of its own prior turns here, never trusted from the caller.
 */

export type StartTurnModel = Readonly<{ id: string; name: string }>;

export type StartTurnInput = Readonly<{
  /** `null` for a brand-new thread. */
  threadId: string | null;
  prompt: string;
  /** Only used to seed a brand-new thread. Ignored for an existing one. */
  models: readonly StartTurnModel[];
}>;

export type StartTurnResponse = Readonly<{
  id: string;
  modelId: string;
  modelName: string;
}>;

export type StartTurnResult =
  | Readonly<{
      ok: true;
      threadId: string;
      turnId: string;
      responses: readonly StartTurnResponse[];
    }>
  | Readonly<{ ok: false; error: string }>;

const refuse = (error: string): StartTurnResult =>
  Object.freeze({ ok: false as const, error });

export const startTurn = async (input: StartTurnInput): Promise<StartTurnResult> => {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    return refuse("Sign in to send a prompt to the arena.");
  }

  const prompt = input.prompt.trim();

  if (!prompt) {
    return refuse("Write a prompt before sending.");
  }

  if (
    input.threadId === null &&
    (input.models.length < MIN_SELECTED_MODELS ||
      input.models.length > MAX_SELECTED_MODELS)
  ) {
    return refuse("Pick between one and three models.");
  }

  const user = await ensureAppUser(clerkId);

  const result = await database().$transaction(async (tx) => {
    const existingThread = input.threadId
      ? await tx.thread.findUnique({
          where: { id: input.threadId },
          select: { id: true, userId: true },
        })
      : null;

    if (input.threadId && existingThread === null) {
      return refuse("That thread doesn't exist any more.");
    }

    if (existingThread && existingThread.userId !== user.id) {
      return refuse("That thread isn't yours to add to.");
    }

    // A thread's models are locked at turn one: read back what it has already
    // answered with rather than trust whatever the caller sent this time.
    const models = existingThread
      ? await tx.modelResponse
          .findMany({
            where: { turn: { threadId: existingThread.id } },
            distinct: ["modelId"],
            orderBy: { createdAt: "asc" },
            select: { modelId: true, modelName: true },
          })
          .then((rows) => rows.map((row) => ({ id: row.modelId, name: row.modelName })))
      : input.models;

    // Touched on every follow-up so the sidebar's recency grouping (feature 7)
    // reflects a thread's last real activity, not just when it was created.
    // `@updatedAt` only fires on a write to the Thread row itself.
    const thread = existingThread
      ? await tx.thread.update({
          where: { id: existingThread.id },
          data: { updatedAt: new Date() },
          select: { id: true },
        })
      : await tx.thread.create({
          data: { userId: user.id, title: prompt.slice(0, 80) },
          select: { id: true },
        });

    const turn = await tx.turn.create({
      data: { threadId: thread.id, prompt },
      select: { id: true },
    });

    const responses = await Promise.all(
      models.map((model) =>
        tx.modelResponse.create({
          data: { turnId: turn.id, modelId: model.id, modelName: model.name },
          select: { id: true, modelId: true, modelName: true },
        }),
      ),
    );

    return Object.freeze({
      ok: true as const,
      threadId: thread.id,
      turnId: turn.id,
      responses,
    });
  });

  if (result.ok) {
    // The sidebar's thread list (feature 7) is read server-side in the shared
    // shell layout, which a plain client-side `push` to a route the router has
    // never rendered can serve from its own cache, so a new thread would be
    // missing from the list it just joined. Revalidating here rather than
    // calling `router.refresh()` in the browser is deliberate and is the fix
    // for a real bug: `refresh()` fired straight after `push()` starts a second
    // RSC request that races the navigation, and whichever lands second
    // replaces the page segment — which discarded the freshly-mounted arena
    // that had just opened the model streams. The answer still finished and
    // still persisted, it just had nowhere on screen left to go, so a brand-new
    // thread's first turn only appeared after a manual reload. Invalidating
    // from inside the action instead means the fresh tree arrives with this
    // action's own response, already in hand before the browser navigates, so
    // there is one navigation and nothing to race.
    //
    // `"layout"` because the stale thing is the shell layout, which every
    // screen shares. The cost, accepted: this also drops the hour-long fetch
    // cache in `fetch-model-catalog.ts` for these paths, so the next render
    // pays one more OpenRouter round trip. That is once per prompt sent, not
    // once per render, which is the cost that cache exists to avoid.
    revalidatePath("/", "layout");

    trackPromptSent({
      clerkId,
      threadId: result.threadId,
      turnId: result.turnId,
      modelIds: result.responses.map((response) => response.modelId),
    });
  }

  return result;
};
