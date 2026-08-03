"use client";

import { SignInButton, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState, type KeyboardEvent } from "react";

import {
  MAX_SELECTED_MODELS,
  MIN_SELECTED_MODELS,
  type CatalogModel,
} from "@/infrastructure/model-catalog";

import { ModelPicker } from "./model-picker";

/**
 * The prompt box and the models it will go to.
 *
 * Selection is client state, on every thread rather than only a new one. Models
 * used to be locked at a thread's first turn, which meant this component took a
 * `locked` prop and hid the picker for the rest of the thread's life; that lock
 * is gone and `docs/scope.md` records why. `defaultSelection` is now the whole
 * story — the catalog's default trio for a new thread, or the models a thread's
 * most recent turn ran, so a follow-up repeats the same cast unless you change
 * it.
 *
 * A model can leave OpenRouter's free list between turns, so an id in
 * `defaultSelection` is not guaranteed to still exist. Those are reported rather
 * than silently dropped: a chip that quietly vanishes and a send button that
 * quietly refuses is the same screen as a broken app.
 *
 * Sending itself, and the turn/stream state it produces, belongs to
 * `ArenaScreen`. This component only ever reports "send this prompt, to these
 * models" upward.
 */

type SelectedModel = Readonly<{ id: string; name: string }>;

type ComposerProps = {
  readonly catalog: readonly CatalogModel[] | null;
  /**
   * The ids this composer opens with: a thread's latest turn, or the catalog's
   * default trio for a thread that does not exist yet.
   */
  readonly defaultSelection: readonly string[];
  readonly disabled: boolean;
  readonly onSend: (prompt: string, models: readonly SelectedModel[]) => void;
};

const RemoveIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="size-3"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    aria-hidden
  >
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
);

const SendIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="size-4"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
);

/**
 * The catalog is the one thing this screen cannot do without, so its failure
 * gets a sentence and a way forward rather than an empty row of chips.
 */
const CatalogUnavailable = () => {
  const router = useRouter();

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
      <p className="text-muted-foreground text-xs">
        The model list isn&rsquo;t loading, so there&rsquo;s nothing to send to yet.
      </p>
      <button
        type="button"
        onClick={() => router.refresh()}
        className="border-input hover:bg-muted rounded-full border px-2.5 py-1 text-xs font-medium transition-colors"
      >
        Try again
      </button>
    </div>
  );
};

export const Composer = ({
  catalog,
  defaultSelection,
  disabled,
  onSend,
}: ComposerProps) => {
  const { isSignedIn } = useUser();
  const [prompt, setPrompt] = useState("");
  const [selectedIds, setSelectedIds] = useState<readonly string[]>(defaultSelection);

  const selectedModels = (catalog ?? []).filter((model) =>
    selectedIds.includes(model.id),
  );

  /**
   * Ids this thread opened with that the live catalog no longer has. Measured
   * against `defaultSelection` rather than `selectedIds` so it describes the
   * thread, and stays stable while you pick replacements, instead of shifting
   * every time you toggle a chip.
   */
  const unavailableCount = defaultSelection.filter(
    (id) => !(catalog ?? []).some((model) => model.id === id),
  ).length;

  /**
   * Every count below is taken from what the catalog actually still offers, and
   * a toggle prunes the rest away. Counting an id the catalog has dropped is not
   * a cosmetic error, it is a trap: a thread that opened with three models and
   * lost two would sit at "3 of 3 selected" with one real chip, refusing to let
   * you add the replacement you need.
   */
  const availableIds = selectedModels.map((model) => model.id);

  const toggleModel = (modelId: string) =>
    setSelectedIds((current) => {
      const available = current.filter((id) =>
        (catalog ?? []).some((model) => model.id === id),
      );

      if (available.includes(modelId)) {
        return available.length <= MIN_SELECTED_MODELS
          ? available
          : available.filter((id) => id !== modelId);
      }

      return available.length >= MAX_SELECTED_MODELS
        ? available
        : [...available, modelId];
    });

  const atFloor = selectedModels.length <= MIN_SELECTED_MODELS;

  const canSend = !disabled && prompt.trim().length > 0 && selectedModels.length > 0;

  const submit = () => {
    if (!canSend) return;

    onSend(
      prompt,
      selectedModels.map((model) => ({ id: model.id, name: model.name })),
    );
    setPrompt("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className="bg-background/85 sticky bottom-0 px-4 pt-2 pb-4 backdrop-blur-sm sm:px-6">
      <div className="surface mx-auto max-w-5xl p-3">
        <label htmlFor="prompt" className="sr-only">
          Your prompt
        </label>
        <textarea
          id="prompt"
          rows={2}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Ask anything. Enter to send, shift + enter for a new line."
          className="placeholder:text-muted-foreground w-full resize-none bg-transparent px-1 py-1 text-[15px] leading-relaxed outline-none disabled:opacity-60"
        />
        <div className="mt-2 flex items-end justify-between gap-3">
          {!catalog ? (
            <CatalogUnavailable />
          ) : (
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              {selectedModels.map((model) => (
                <span
                  key={model.id}
                  className="border-border text-muted-foreground inline-flex items-center gap-1.5 rounded-full border py-1 pr-1.5 pl-2.5 text-xs"
                >
                  {model.name}
                  <button
                    type="button"
                    disabled={atFloor}
                    onClick={() => toggleModel(model.id)}
                    className="hover:text-foreground rounded-full p-0.5 transition-colors disabled:opacity-40"
                    aria-label={`Remove ${model.name}`}
                    title={atFloor ? "Keep at least one model" : undefined}
                  >
                    <RemoveIcon />
                  </button>
                </span>
              ))}
              <ModelPicker
                catalog={catalog}
                selectedIds={availableIds}
                onToggle={toggleModel}
              />
            </div>
          )}

          {isSignedIn ? (
            <button
              type="button"
              disabled={!canSend}
              onClick={submit}
              className="bg-primary text-primary-foreground hover:bg-primary/90 flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors disabled:opacity-40"
              aria-label="Send prompt"
            >
              <SendIcon />
            </button>
          ) : (
            <SignInButton mode="modal">
              <button
                type="button"
                className="border-input hover:bg-muted shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
              >
                Sign in to send
              </button>
            </SignInButton>
          )}
        </div>
      </div>
      {/* A model leaving the free list is the one case where this line has to
          do more than reassure. It says which way to go, because the send button
          is disabled until something answerable is selected and a disabled
          button that explains nothing is indistinguishable from a broken one. */}
      <p className="text-muted-foreground mx-auto mt-2 max-w-5xl text-center text-xs">
        {unavailableCount === 0
          ? "One to three models at a time. Every one of them is free."
          : selectedModels.length === 0
            ? "None of this thread's models are on the free list any more. Pick one to carry on."
            : `${unavailableCount === 1 ? "One of this thread's models is" : `${unavailableCount} of this thread's models are`} no longer free, so this turn goes to the rest.`}
      </p>
    </div>
  );
};
