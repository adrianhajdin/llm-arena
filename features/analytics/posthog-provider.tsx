"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import posthog from "posthog-js";
import { PostHogProvider as PostHogContextProvider } from "posthog-js/react";
import { useEffect, type ReactNode } from "react";

import { publicEnv } from "@/infrastructure/public-env";

const { posthogKey, posthogHost } = publicEnv;

if (typeof window !== "undefined" && posthogKey && posthogHost) {
  posthog.init(posthogKey, {
    // Requests go through this app's own `/ingest` rewrite (next.config.ts)
    // rather than straight to PostHog, so an ad blocker sees first-party
    // traffic. `ui_host` keeps the real host for things the proxy doesn't
    // cover, like the in-app toolbar link.
    api_host: "/ingest",
    ui_host: posthogHost,
    capture_pageview: "history_change",
    capture_pageleave: true,
    // Session replay and heatmaps are on from the start, per docs/scope.md.
    disable_session_recording: false,
    enable_heatmaps: true,
    // An unhandled exception is a real failure the user sees with nothing
    // reported anywhere; model failures already land in `model_answered`,
    // this catches the rest.
    capture_exceptions: true,
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
