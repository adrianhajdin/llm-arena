import "server-only";

import { database } from "./database";

/**
 * The two things anything that touches `users` actually needs, kept separate
 * on purpose: creating a row is a write only the turn-creation path should do,
 * everything downstream of that (the chat route, voting) only ever needs to
 * look one up.
 *
 * There is no Clerk webhook here. A `users` row is created lazily, the first
 * time a signed-in person's prompt is actually written to the database, which
 * is the one place this app needs one to exist. A webhook would be a second
 * endpoint and a secret to manage for a guarantee this already gets for free.
 */

/** Finds or creates the app's own `users` row for a signed-in Clerk person. */
export const ensureAppUser = async (clerkId: string): Promise<{ readonly id: string }> =>
  database().user.upsert({
    where: { clerkId },
    create: { clerkId },
    update: {},
    select: { id: true },
  });

/** Looks up the app's `users.id` for a Clerk person, or `null` if none exists yet. */
export const findAppUserId = async (clerkId: string): Promise<string | null> => {
  const user = await database().user.findUnique({
    where: { clerkId },
    select: { id: true },
  });

  return user?.id ?? null;
};
