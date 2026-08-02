/**
 * PLACEHOLDER — feature 6 replaces this with a real turn: one prompt fanned out
 * to the selected models, each answer streaming and failing on its own request.
 * Feature 5 replaces the model names with the live free-tier catalog. Delete
 * this file when both exist.
 *
 * One response is deliberately FAILED, because a failed model is a real row in
 * this data model, not an absent one, and the UI has to look right when a
 * column dies while its neighbours keep going.
 */

export type PlaceholderResponse = {
  readonly modelId: string;
  readonly modelName: string;
  readonly status: "COMPLETE" | "FAILED";
  readonly text: string;
  readonly won: boolean;
};

export const PLACEHOLDER_PROMPT =
  "Explain OKLCH to a designer who already knows HSL. Two paragraphs, no maths.";

export const PLACEHOLDER_RESPONSES: readonly PlaceholderResponse[] = [
  {
    modelId: "phi",
    modelName: "Phi 4 Reasoning",
    status: "COMPLETE",
    text: "HSL promises that if you hold saturation and lightness still and spin the hue, the colours you get back are equally bright. They are not. Yellow at 50% lightness is far brighter than blue at 50% lightness, which is why a palette built by rotating hue in HSL comes out uneven and needs hand-correcting everywhere.\n\nOKLCH fixes the promise rather than the palette. Its lightness matches what your eye actually reports, so 0.64 is the same perceived brightness at every hue. Rotate the hue and the colours stay level. The trade is that chroma has a ceiling that moves with hue and lightness, so some values you can write are outside what a screen can show.",
    won: true,
  },
  {
    modelId: "qwen",
    modelName: "Qwen 3 Coder",
    status: "COMPLETE",
    text: "Think of HSL as a cylinder that lies to you about brightness. Every hue at the same L reads as a different intensity, so a set of HSL colours that looks systematic on paper looks lumpy on screen.\n\nOKLCH is the same three ideas, lightness, chroma and hue, measured against human vision instead of raw channel maths. Same L means same apparent brightness. That makes contrast something you can plan rather than discover.",
    won: false,
  },
  {
    modelId: "nemotron",
    modelName: "Nemotron 3 Ultra",
    status: "FAILED",
    text: "",
    won: false,
  },
];
