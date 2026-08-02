"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { cn } from "@/infrastructure/ui";

const SunIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    aria-hidden
  >
    <circle cx="12" cy="12" r="4.25" />
    <path
      strokeLinecap="round"
      d="M12 2.5v2M12 19.5v2M4.4 4.4l1.4 1.4M18.2 18.2l1.4 1.4M2.5 12h2M19.5 12h2M4.4 19.6l1.4-1.4M18.2 5.8l1.4-1.4"
    />
  </svg>
);

const MoonIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    aria-hidden
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M20 13.4A8.4 8.4 0 1 1 10.6 4a6.9 6.9 0 0 0 9.4 9.4Z"
    />
  </svg>
);

/**
 * The theme is only known on the client, so the button renders inert until it
 * has mounted rather than guessing and flipping on hydration. It keeps its size
 * either way, so nothing around it shifts.
 */
const neverChanges = () => () => {};

export const ThemeToggle = ({ className }: { readonly className?: string }) => {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    neverChanges,
    () => true,
    () => false,
  );

  const isDark = resolvedTheme === "dark";
  const classes = cn(
    "border-border text-muted-foreground hover:text-foreground hover:border-input inline-flex size-9 items-center justify-center rounded-full border transition-colors [&_svg]:size-4",
    className,
  );

  if (!mounted) {
    return <span className={classes} aria-hidden />;
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={classes}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
};
