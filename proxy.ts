import { clerkMiddleware } from "@clerk/nextjs/server";

/**
 * Next 16 renamed the middleware entry point from `middleware.ts` to
 * `proxy.ts`. The file name is the only thing that changed.
 *
 * This runs Clerk on every request so `auth()` resolves on the server, but it
 * protects nothing yet. Which routes actually require a signed-in user is
 * decided in feature 8 (public threads are readable without an account, only
 * sending a prompt and voting need sign-in), so gating here now would
 * contradict that.
 */
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest))(?:.*)|api|trpc)(.*)",
  ],
};
