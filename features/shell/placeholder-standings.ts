/**
 * PLACEHOLDER — feature 6 replaces this with the real per-model record for the
 * open thread, counted from votes on that thread's turns. Delete this file and
 * the one import of it in `top-bar.tsx` when voting writes real rows.
 */

export type ModelStanding = {
  readonly modelId: string;
  readonly shortName: string;
  readonly won: number;
  readonly of: number;
};

export const PLACEHOLDER_STANDINGS: readonly ModelStanding[] = [
  { modelId: "phi", shortName: "Phi 4 Reasoning", won: 0, of: 2 },
  { modelId: "qwen", shortName: "Qwen 3 Coder", won: 1, of: 2 },
  { modelId: "nemotron", shortName: "Nemotron 3 Ultra", won: 1, of: 2 },
];
