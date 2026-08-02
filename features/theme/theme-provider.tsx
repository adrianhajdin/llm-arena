"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

/**
 * Dark is where this design lives, but the sketch puts a real toggle in the
 * sidebar, and a toggle cannot be built on `prefers-color-scheme` alone. So the
 * mode is a `.dark` class on `<html>`, seeded from the system setting on a
 * first visit and remembered after that.
 */
export const ThemeProvider = ({ children }: { readonly children: ReactNode }) => (
  <NextThemesProvider
    attribute="class"
    defaultTheme="system"
    enableSystem
    disableTransitionOnChange
  >
    {children}
  </NextThemesProvider>
);
