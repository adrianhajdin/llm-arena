import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { guardThreadRequest } from "@/features/threads/thread-protection";

/**
 * Next 16 renamed the middleware entry point from `middleware.ts` to
 * `proxy.ts`. The file name is the only thing that changed.
 *
 * This runs Clerk on every request so `auth()` resolves on the server. It
 * still gates no route by sign-in: which routes require a signed-in user was
 * decided in feature 8 (public threads are readable without an account, only
 * sending a prompt and voting need sign-in), and that stands. What it does
 * add is Arcjet coverage for `/t/[threadId]`, the one page that hits the
 * database with no auth gate at all — `page.tsx` is a Server Component and
 * never sees a `Request`, so this proxy is the only place upstream of it that
 * does.
 */
export default clerkMiddleware(async (_auth, request) => {
  if (request.nextUrl.pathname.startsWith("/t/")) {
    const denied = await guardThreadRequest(request);

    if (denied) return denied;
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest))(?:.*)|api|trpc)(.*)",
  ],
};
