import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";

import { PostHogProvider } from "@/features/analytics/posthog-provider";
import { ThemeProvider } from "@/features/theme/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** Words a person wrote. Optical sizing keeps it sharp at heading scale. */
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "LLM Arena",
  description:
    "Send one prompt to three models at once, watch them answer side by side, and vote for the best.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          <ClerkProvider>
            <PostHogProvider>{children}</PostHogProvider>
          </ClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
