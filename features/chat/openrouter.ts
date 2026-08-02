import "server-only";

import { createOpenRouter, type OpenRouterProvider } from "@openrouter/ai-sdk-provider";

import { serverEnv } from "@/infrastructure/env";

/**
 * The one OpenRouter provider instance for the app, built on first use.
 *
 * Lazy for the same reason the database client is: `next build` evaluates
 * route modules, and a build should not require a real API key.
 *
 * The referer and title headers are what make this app show up by name in
 * OpenRouter's own dashboard, which is the only place the per-call accounting
 * can be checked against what we display.
 */
let cached: OpenRouterProvider | null = null;

export const openrouter = (): OpenRouterProvider =>
  (cached ??= createOpenRouter({
    apiKey: serverEnv().OPENROUTER_API_KEY,
    headers: {
      "HTTP-Referer": "https://llm-arena.local",
      "X-Title": "LLM Arena",
    },
  }));
