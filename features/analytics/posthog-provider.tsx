"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import posthog from "posthog-js";
import { PostHogProvider as PostHogContextProvider } from "posthog-js/react";
import { useEffect, type ReactNode } from "react";

/**
 * `NEXT_PUBLIC_` values have to be read as literal property accesses so Next
 * can inline them into the browser bundle. That rules out the server env
 * module here, which is why these two are checked on their own.
 */
const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

if (typeof window !== "undefined" && posthogKey && posthogHost) {
  posthog.init(posthogKey, {
    api_host: posthogHost,
    capture_pageview: "history_change",
    capture_pageleave: true,
    // Session replay and heatmaps are on from the start, per docs/scope.md.
    disable_session_recording: false,
    enable_heatmaps: true,
    defaults: "2025-05-24",
  });
}

/**
 * Ties the PostHog person to the Clerk user as soon as Clerk resolves, so
 * events belong to a real account instead of an anonymous id. Signing out
 * resets the distinct id rather than leaving the next visitor stitched onto
 * the previous person.
 */
const useIdentifyFromClerk = (): void => {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn && user) {
      posthog.identify(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
      });
      return;
    }

    posthog.reset();
  }, [isLoaded, isSignedIn, user]);
};

const PostHogIdentity = ({ children }: { readonly children: ReactNode }) => {
  useIdentifyFromClerk();
  return <>{children}</>;
};

export const PostHogProvider = ({ children }: { readonly children: ReactNode }) => {
  if (!posthogKey || !posthogHost) return <>{children}</>;

  return (
    <PostHogContextProvider client={posthog}>
      <PostHogIdentity>{children}</PostHogIdentity>
    </PostHogContextProvider>
  );
};
