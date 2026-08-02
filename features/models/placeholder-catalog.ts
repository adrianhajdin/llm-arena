/**
 * PLACEHOLDER — feature 5 replaces this with OpenRouter's live free-tier list,
 * sorted by context window. Feature 1 confirmed the real catalog returns 337
 * models, 14 of them free, which is what this page will actually render. Delete
 * this file when that fetch exists.
 */

export type CatalogModel = {
  readonly id: string;
  readonly name: string;
  readonly provider: string;
  readonly contextTokens: number;
};

export const PLACEHOLDER_CATALOG: readonly CatalogModel[] = [
  {
    id: "nvidia/nemotron-3-ultra:free",
    name: "Nemotron 3 Ultra",
    provider: "NVIDIA",
    contextTokens: 262144,
  },
  {
    id: "qwen/qwen3-coder:free",
    name: "Qwen 3 Coder",
    provider: "Qwen",
    contextTokens: 262144,
  },
  {
    id: "meta-llama/llama-4-scout:free",
    name: "Llama 4 Scout",
    provider: "Meta",
    contextTokens: 131072,
  },
  {
    id: "microsoft/phi-4-reasoning:free",
    name: "Phi 4 Reasoning",
    provider: "Microsoft",
    contextTokens: 32768,
  },
  {
    id: "mistralai/mistral-small-3.2:free",
    name: "Mistral Small 3.2",
    provider: "Mistral",
    contextTokens: 96000,
  },
  {
    id: "google/gemma-3-27b:free",
    name: "Gemma 3 27B",
    provider: "Google",
    contextTokens: 96000,
  },
];
