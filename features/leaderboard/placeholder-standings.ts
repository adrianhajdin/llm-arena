/**
 * PLACEHOLDER — feature 9 replaces this with the real query: group by `modelId`,
 * join wins from votes, average speed over completed answers only. That query
 * was already proven against the real database in feature 3. Delete this file
 * when it ships.
 */

export type LeaderboardRow = {
  readonly modelId: string;
  readonly modelName: string;
  readonly won: number;
  readonly of: number;
  readonly avgFirstTokenMs: number;
  readonly avgTokensPerSecond: number;
};

export const PLACEHOLDER_ROWS: readonly LeaderboardRow[] = [
  {
    modelId: "nemotron",
    modelName: "NVIDIA: Nemotron 3 Ultra",
    won: 507,
    of: 700,
    avgFirstTokenMs: 1186,
    avgTokensPerSecond: 57.4,
  },
  {
    modelId: "qwen",
    modelName: "Qwen 3 Coder",
    won: 302,
    of: 559,
    avgFirstTokenMs: 842,
    avgTokensPerSecond: 41.2,
  },
  {
    modelId: "phi",
    modelName: "Phi 4 Reasoning",
    won: 188,
    of: 512,
    avgFirstTokenMs: 2104,
    avgTokensPerSecond: 18.7,
  },
  {
    modelId: "llama",
    modelName: "Meta: Llama 4 Scout",
    won: 96,
    of: 470,
    avgFirstTokenMs: 733,
    avgTokensPerSecond: 63.9,
  },
];
