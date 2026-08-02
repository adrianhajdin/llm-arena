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
 * Selection is client state only while a thread doesn't exist yet. Once one
 * does, `locked` carries its fixed models straight from the database, read
 * back by `startTurn` rather than trusted from this component, and the picker
 * disappears: a thread's models are decided at turn one and stay that way for
 * its life (docs/scope.md, feature 6).
 *
 * Sending itself, and the turn/stream state it produces, belongs to
 * `ArenaScreen`. This component only ever reports "send this prompt, to these
 * models" upward.
 */

type LockedModel = Readonly<{ id: string; name: string }>;

type ComposerProps = {
  readonly catalog: readonly CatalogModel[] | null;
  readonly defaultSelection: readonly string[];
  readonly locked: readonly LockedModel[] | null;
  readonly disabled: boolean;
  readonly onSend: (prompt: string, models: readonly LockedModel[]) => void;
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
  locked,
  disabled,
  onSend,
}: ComposerProps) => {
  const { isSignedIn } = useUser();
  const [prompt, setPrompt] = useState("");
  const [selectedIds, setSelectedIds] = useState<readonly string[]>(defaultSelection);

  const selectedModels = (catalog ?? []).filter((model) =>
    selectedIds.includes(model.id),
  );

  const toggleModel = (modelId: string) =>
    setSelectedIds((current) => {
      if (current.includes(modelId)) {
        return current.length <= MIN_SELECTED_MODELS
          ? current
          : current.filter((id) => id !== modelId);
      }

      return current.length >= MAX_SELECTED_MODELS ? current : [...current, modelId];
    });

  const atFloor = selectedIds.length <= MIN_SELECTED_MODELS;

  const canSend =
    !disabled && prompt.trim().length > 0 && (locked ? true : selectedModels.length > 0);

  const submit = () => {
    if (!canSend) return;

    const models =
      locked ?? selectedModels.map((model) => ({ id: model.id, name: model.name }));

    onSend(prompt, models);
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
          ) : locked ? (
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              {locked.map((model) => (
                <span
                  key={model.id}
                  className="border-border text-muted-foreground inline-flex items-center gap-1.5 rounded-full border py-1 pr-2.5 pl-2.5 text-xs"
                >
                  {model.name}
                </span>
              ))}
            </div>
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
                selectedIds={selectedIds}
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
      <p className="text-muted-foreground mx-auto mt-2 max-w-5xl text-center text-xs">
        {locked
          ? "This thread's models are fixed. Every one of them is free."
          : "One to three models at a time. Every one of them is free."}
      </p>
    </div>
  );
};
