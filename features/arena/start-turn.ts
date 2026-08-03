"use server";

import { auth } from "@clerk/nextjs/server";

import { trackPromptSent } from "@/infrastructure/analytics-events";
import { MAX_SELECTED_MODELS, MIN_SELECTED_MODELS } from "@/infrastructure/model-catalog";
import { database } from "@/infrastructure/database";
import { ensureAppUser } from "@/infrastructure/current-user";
import { fetchFreeModelCatalog } from "@/infrastructure/fetch-model-catalog";

/**
 * The durable record a prompt becomes, created before any model is ever
 * called: the thread (if new), the turn, and one `STREAMING` `ModelResponse`
 * row per model. The browser learns the model streams exist only after this
 * comes back.
 *
 * Which models a turn runs is the caller's to choose, on every turn rather than
 * only the first. A thread's models used to be locked at turn one and read back
 * out of its own prior turns here; that lock is gone, and `docs/scope.md`
 * records why. The schema always allowed it — `ModelResponse` rows hang off a
 * `turnId` with their own `modelId` — so a thread whose first turn ran three
 * models and whose fourth runs a different three is just data, not a special
 * case.
 *
 * What is *not* the caller's to choose is whether a model is real and free.
 * Every submitted id is resolved against the live free-tier catalog here and
 * anything off that list is refused, which also means the name written to the
 * database is the catalog's own rather than whatever the request claimed. Like
 * `/api/chat`, this fails closed: a catalog we cannot read is not permission to
 * record a turn against models we cannot vouch for.
 */

export type StartTurnModel = Readonly<{ id: string; name: string }>;

export type StartTurnInput = Readonly<{
  /** `null` for a brand-new thread. */
  threadId: string | null;
  prompt: string;
  /**
   * The models this turn should run. Only the ids are read; each `name` is
   * discarded and replaced with the catalog's own. See above.
   */
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
      /**
       * The thread's title as actually stored. Returned so the sidebar can show
       * a brand-new thread without waiting for a server render, and returned
       * rather than recomputed in the browser so the "first 80 characters of the
       * first prompt" rule has exactly one home.
       */
      threadTitle: string;
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

  // Deduplicated before it is counted, and this is load-bearing rather than
  // tidiness: one model answers a given turn once (`@@unique([turnId, modelId])`),
  // so the same id twice would fail the insert and surface as a raw database
  // error, which this app never shows anyone. The UI cannot produce a duplicate;
  // a hand-written request can.
  const requestedIds = [...new Set(input.models.map((model) => model.id))];

  // Checked on every turn, not just a thread's first. While models were locked
  // at turn one this only had to hold for a new thread, since a follow-up's set
  // came from the database; now that any turn carries its own set, an unchecked
  // follow-up could ask for none or for fifty.
  if (
    requestedIds.length < MIN_SELECTED_MODELS ||
    requestedIds.length > MAX_SELECTED_MODELS
  ) {
    return refuse("Pick between one and three models.");
  }

  const catalog = await fetchFreeModelCatalog();

  if (!catalog) {
    return refuse("We can't reach the model list right now. Try again in a moment.");
  }

  // Resolved rather than merely validated, so the name written beside the answer
  // is the catalog's own. Note what this means: `StartTurnModel.name` is never
  // read here at all. The caller sends it because the browser needs it locally
  // to render the turn, and the server discards it.
  const models = requestedIds.flatMap((id) => {
    const found = catalog.find((candidate) => candidate.id === id);

    return found ? [{ id: found.id, name: found.name }] : [];
  });

  if (models.length !== requestedIds.length) {
    return refuse("One of those models isn't on the free list any more. Pick another.");
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

    // Touched on every follow-up so the sidebar's recency grouping (feature 7)
    // reflects a thread's last real activity, not just when it was created.
    // `@updatedAt` only fires on a write to the Thread row itself.
    const thread = existingThread
      ? await tx.thread.update({
          where: { id: existingThread.id },
          data: { updatedAt: new Date() },
          select: { id: true, title: true },
        })
      : await tx.thread.create({
          data: { userId: user.id, title: prompt.slice(0, 80) },
          select: { id: true, title: true },
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
      threadTitle: thread.title,
      responses,
    });
  });

  if (result.ok) {
    // Deliberately nothing else on this path, and specifically no
    // `revalidatePath`. There was one here, to refresh the sidebar's thread
    // list, and it was a measurable mistake: a server action that revalidates
    // re-renders the current route and ships that tree back *in this action's
    // own response*, so every prompt sat waiting on a full second page render
    // plus a cold 530KB refetch of the model catalog that the revalidation had
    // itself just purged — before the caller had even been told the turn
    // exists. This action's only job is to make the rows exist and say so,
    // quickly. What the sidebar does about it is recorded in
    // `arena-screen.tsx` and in `docs/scope.md`.
    trackPromptSent({
      clerkId,
      threadId: result.threadId,
      turnId: result.turnId,
      modelIds: result.responses.map((response) => response.modelId),
    });
  }

  return result;
};
