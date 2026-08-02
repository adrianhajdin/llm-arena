import {
  MAX_SELECTED_MODELS,
  formatContextWindow,
  type CatalogModel,
} from "@/infrastructure/model-catalog";

/**
 * The live free-tier catalog, as something you read rather than something you
 * pick from. The picker in the arena is the other half of this.
 *
 * It is a table and not the card grid this screen started as, because the one
 * fact that actually separates these models is the context window and it spans
 * nearly eight to one across the list. A grid of equal cards throws that away:
 * every card looks the same size whether the model holds a million tokens or a
 * hundred and twenty-eight thousand. Sorted rows with the window drawn to
 * scale make the shape of the free tier the thing you see first, which is one
 * enormous model and then a pack.
 *
 * The bar is grey, not rust. Rust means "you can operate this" everywhere else
 * in the app, and spending it on a specification you can only read would make
 * the accent mean less on every other screen.
 */

type ModelsScreenProps = {
  readonly catalog: readonly CatalogModel[] | null;
  readonly defaultSelection: readonly string[];
};

const CatalogUnavailable = () => (
  <>
    <p className="text-muted-foreground mt-3 max-w-xl text-[15px] leading-relaxed">
      The catalog didn&rsquo;t answer just now, so there is nothing to list. Nothing else
      in the arena is affected.
    </p>
    <a
      href="/models"
      className="border-input hover:bg-muted mt-5 inline-block rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors"
    >
      Try again
    </a>
  </>
);

export const ModelsScreen = ({ catalog, defaultSelection }: ModelsScreenProps) => {
  const widestWindow = catalog?.[0]?.contextTokens ?? 1;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-display">Models</h1>

      {!catalog ? (
        <CatalogUnavailable />
      ) : (
        <>
          <p className="text-muted-foreground mt-3 max-w-xl text-[15px] leading-relaxed">
            Every model the arena can reach, largest context window first. All of them are
            free, which is the whole reason you can put three against each other without
            thinking about it. The {MAX_SELECTED_MODELS} marked{" "}
            <span className="text-foreground">default</span> open a new round: the widest
            window from each of three different vendors.
          </p>

          {/* One string rather than interleaved JSX text: a multi-line JSX text
              node has its line-leading whitespace stripped, which silently
              rendered this as "1Mwidest window" the first time it was built. */}
          <p className="metric metric-value mt-5">
            {`${catalog.length} models · ${formatContextWindow(widestWindow)} widest window · $0.0000 each`}
          </p>

          <div className="surface mt-6 overflow-hidden">
            <table className="w-full text-left">
              <caption className="sr-only">
                Free-tier models available in the arena, sorted by context window, largest
                first.
              </caption>
              <thead>
                <tr className="border-border border-b">
                  <th scope="col" className="text-eyebrow px-4 py-2.5 font-medium">
                    Model
                  </th>
                  <th
                    scope="col"
                    className="text-eyebrow hidden px-4 py-2.5 text-right font-medium sm:table-cell"
                  >
                    Per call
                  </th>
                  <th
                    scope="col"
                    className="text-eyebrow w-32 px-4 py-2.5 text-right font-medium sm:w-48"
                  >
                    Context
                  </th>
                </tr>
              </thead>
              <tbody>
                {catalog.map((model) => (
                  <tr key={model.id} className="border-border border-b last:border-b-0">
                    <th scope="row" className="px-4 py-3.5 font-normal">
                      <span className="flex min-w-0 items-center gap-3">
                        <span
                          className="border-input text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-full border font-mono text-xs"
                          aria-hidden
                        >
                          {model.provider.slice(0, 1).toUpperCase()}
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-2">
                            <span className="font-display truncate text-lg leading-tight">
                              {model.name}
                            </span>
                            {defaultSelection.includes(model.id) && (
                              <span className="border-border text-muted-foreground shrink-0 rounded-full border px-1.5 py-px text-[10px] font-medium tracking-[0.08em] uppercase">
                                default
                              </span>
                            )}
                          </span>
                          <span className="text-muted-foreground block truncate text-xs">
                            {model.provider}{" "}
                            <span className="font-mono">&middot; {model.id}</span>
                          </span>
                        </span>
                      </span>
                    </th>

                    <td className="metric metric-value hidden px-4 py-3.5 text-right align-middle sm:table-cell">
                      $0.0000
                    </td>

                    <td className="px-4 py-3.5 align-middle">
                      <span className="metric metric-value block text-right">
                        {formatContextWindow(model.contextTokens)}
                      </span>
                      <span className="measure-bar mt-2 block" aria-hidden>
                        <span
                          style={{
                            width: `${(model.contextTokens / widestWindow) * 100}%`,
                          }}
                        />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
