/**
 * Runs once when the server starts.
 *
 * The only job here is to force the environment check so a missing or
 * malformed variable crashes the process on boot, named, instead of surfacing
 * later as a confusing failure on someone's first prompt.
 */
export const register = async (): Promise<void> => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { serverEnv } = await import("./infrastructure/env");
  serverEnv();
};
