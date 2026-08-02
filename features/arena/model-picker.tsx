"use client";

import {
  MAX_SELECTED_MODELS,
  MIN_SELECTED_MODELS,
  formatContextWindow,
  type CatalogModel,
} from "@/infrastructure/model-catalog";
import { cn } from "@/infrastructure/ui";
import { Popover, PopoverContent, PopoverTrigger } from "@/infrastructure/ui-kit/popover";

/**
 * The live free-tier catalog, as something you pick three of.
 *
 * The trigger stays operable at the cap instead of being disabled, which is a
 * correction to the plan made while building it: disabling the only way into
 * the list means the only way to swap a model is to delete a chip first, so
 * the control that says "no" is also the control you need to say "yes". The
 * refusal moved inside the panel, where it can name the model you would have
 * to give up, and the trigger changes verb instead.
 *
 * Rows are toggle buttons rather than checkboxes because a checkbox implies a
 * form that gets submitted; this takes effect the moment you press it.
 */

type ModelPickerProps = {
  readonly catalog: readonly CatalogModel[];
  readonly selectedIds: readonly string[];
  readonly onToggle: (modelId: string) => void;
};

const CheckMark = () => (
  <svg viewBox="0 0 16 16" className="size-3" fill="currentColor" aria-hidden>
    <path d="M6.4 11.3 3.3 8.2l1.1-1.1 2 2 5.2-5.2 1.1 1.1z" />
  </svg>
);

export const ModelPicker = ({ catalog, selectedIds, onToggle }: ModelPickerProps) => {
  const atCap = selectedIds.length >= MAX_SELECTED_MODELS;
  const atFloor = selectedIds.length <= MIN_SELECTED_MODELS;

  return (
    <Popover>
      <PopoverTrigger className="border-input hover:bg-muted rounded-full border px-2.5 py-1 text-xs font-medium transition-colors">
        {atCap ? "Change models" : "Add model"}
      </PopoverTrigger>

      <PopoverContent
        side="top"
        align="start"
        className="w-80"
        aria-label="Choose the models for this round"
      >
        <div className="border-border flex items-baseline justify-between gap-3 border-b px-3 py-2.5">
          <h2 className="text-eyebrow">In this round</h2>
          <p className="metric metric-value">
            {selectedIds.length}/{MAX_SELECTED_MODELS}
          </p>
        </div>

        <ul className="max-h-72 overflow-y-auto p-1.5">
          {catalog.map((model) => {
            const selected = selectedIds.includes(model.id);
            const locked = selected ? atFloor : atCap;

            return (
              <li key={model.id}>
                <button
                  type="button"
                  aria-pressed={selected}
                  disabled={locked}
                  onClick={() => onToggle(model.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors",
                    locked ? "opacity-45" : "hover:bg-muted",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded-sm border",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input",
                    )}
                    aria-hidden
                  >
                    {selected && <CheckMark />}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{model.name}</span>
                    <span className="text-muted-foreground block truncate text-xs">
                      {model.provider}
                    </span>
                  </span>

                  <span className="metric metric-value shrink-0">
                    {formatContextWindow(model.contextTokens)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <p className="text-muted-foreground border-border border-t px-3 py-2.5 text-xs leading-relaxed">
          {atCap && "Three is the cap. Turn one off to make room for another."}
          {!atCap && atFloor && "Keep at least one model. Add another to drop this one."}
          {!atCap && !atFloor && "Every model here is free. Context window on the right."}
        </p>
      </PopoverContent>
    </Popover>
  );
};
