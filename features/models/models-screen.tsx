import { PLACEHOLDER_CATALOG } from "./placeholder-catalog";

/**
 * PLACEHOLDER SCREEN — feature 5 replaces the cards with the live free-tier
 * catalog from OpenRouter and makes this the browsable version of what the
 * "Add model" popover shows.
 *
 * Context window is written in thousands rather than as a raw token count,
 * because "262K" is a size somebody can hold in their head and "262144" is a
 * number they have to parse first. Price reads $0.0000 rather than the word
 * "Free", so it sits in the same mono column as every other measured figure.
 */

const formatContext = (tokens: number) => `${Math.round(tokens / 1024)}K`;

export const ModelsScreen = () => (
  <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
    <h1 className="text-display">Models</h1>
    <p className="text-muted-foreground mt-2 max-w-xl text-[15px] leading-relaxed">
      Every model the arena can reach. All of them are free tier, which is the whole
      reason you can put three of them against each other without thinking about it.
    </p>

    <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {PLACEHOLDER_CATALOG.map((model) => (
        <article key={model.id} className="surface flex flex-col p-4">
          <div className="flex items-center gap-2.5">
            <span
              className="border-input text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-full border font-mono text-xs"
              aria-hidden
            >
              {model.provider.slice(0, 1)}
            </span>
            <div className="min-w-0">
              <h2 className="font-display truncate text-lg leading-tight">
                {model.name}
              </h2>
              <p className="text-muted-foreground truncate text-xs">{model.provider}</p>
            </div>
          </div>

          <dl className="border-border mt-4 flex flex-col gap-1.5 border-t pt-3">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="metric">context</dt>
              <dd className="metric metric-value">
                {formatContext(model.contextTokens)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="metric">price per call</dt>
              <dd className="metric metric-value">$0.0000</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="metric">id</dt>
              <dd className="metric metric-value max-w-44 truncate" title={model.id}>
                {model.id}
              </dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  </div>
);
