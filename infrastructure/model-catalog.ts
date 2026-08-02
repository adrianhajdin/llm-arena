import { z } from "zod";

/**
 * What a free-tier model is, and every pure rule about a set of them.
 *
 * Deliberately free of I/O so both sides of the app can hold it: the `/models`
 * page renders on the server, the picker runs in the browser, and neither
 * should have to reach through a `server-only` module to sort a list or format
 * a number. `fetch-model-catalog.ts` is the effectful half and imports this.
 */

export type CatalogModel = {
  /** OpenRouter's id, exactly as `POST /api/chat` must receive it. */
  readonly id: string;
  /** "Nemotron 3 Ultra", with the vendor prefix and the "(free)" tag removed. */
  readonly name: string;
  /** How the vendor writes itself, for display. */
  readonly provider: string;
  /** The id's namespace, which is the only reliable key to group vendors by. */
  readonly providerId: string;
  readonly contextTokens: number;
};

/**
 * Three at once, and the number is here rather than in the arena because two
 * features answer to it: the picker enforces the cap and the `/models` page
 * marks which models a new round opens with.
 */
export const MAX_SELECTED_MODELS = 3;

/** The one model minimum. A composer with nothing to send to is a dead end. */
export const MIN_SELECTED_MODELS = 1;

/**
 * Only the fields this app actually uses. Unknown keys are ignored rather than
 * rejected, so OpenRouter adding a field never empties the catalog.
 */
const openRouterModelSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  context_length: z.number().int().positive(),
  pricing: z.object({
    prompt: z.string(),
    completion: z.string(),
  }),
});

const openRouterCatalogSchema = z.object({
  data: z.array(z.unknown()),
});

/** "NVIDIA: Nemotron 3 Ultra (free)" is three facts in one string. */
const splitDisplayName = (
  rawName: string,
  providerId: string,
): { readonly name: string; readonly provider: string } => {
  const withoutFreeTag = rawName.replace(/\s*\(free\)\s*$/i, "").trim();
  const separator = withoutFreeTag.indexOf(": ");

  if (separator === -1) {
    // No vendor prefix, so the id's namespace is the only honest provider
    // label there is. It goes out verbatim rather than title-cased into
    // something the vendor does not call itself.
    return { name: withoutFreeTag, provider: providerId };
  }

  return {
    name: withoutFreeTag.slice(separator + 2).trim(),
    provider: withoutFreeTag.slice(0, separator).trim(),
  };
};

const isActuallyFree = (pricing: {
  readonly prompt: string;
  readonly completion: string;
}) => Number(pricing.prompt) === 0 && Number(pricing.completion) === 0;

/**
 * Largest context first, then by name so equal windows never shuffle between
 * renders. Five of the fourteen free models currently sit on the same 262,144.
 */
const byContextWindow = (a: CatalogModel, b: CatalogModel) =>
  b.contextTokens - a.contextTokens || a.name.localeCompare(b.name);

/**
 * Raw JSON to a sorted catalog. A row that does not parse is dropped on its
 * own; one odd entry must never cost the other thirteen.
 *
 * Free means two things at once here, and both are checked: the `:free` id
 * suffix and a genuine zero on both sides of the pricing. `POST /api/chat`
 * refuses any model that is not on this list, so this filter is what stands
 * between a hand-crafted request and a real bill.
 */
export const parseFreeModels = (payload: unknown): readonly CatalogModel[] | null => {
  const catalog = openRouterCatalogSchema.safeParse(payload);

  if (!catalog.success) {
    return null;
  }

  return catalog.data.data
    .map((row) => openRouterModelSchema.safeParse(row))
    .flatMap((row) => (row.success ? [row.data] : []))
    .filter((model) => model.id.endsWith(":free") && isActuallyFree(model.pricing))
    .map((model) => {
      const providerId = model.id.split("/")[0] ?? model.id;

      return {
        id: model.id,
        providerId,
        contextTokens: model.context_length,
        ...splitDisplayName(model.name, providerId),
      };
    })
    .sort(byContextWindow);
};

/**
 * The models a new round opens with: the largest context window from each of
 * three different vendors.
 *
 * Plain top-three-by-context was the alternative and it is worse for one
 * measured reason. Five of the fourteen free models are NVIDIA's, so that rule
 * can hand somebody three flavours of one vendor as their first comparison,
 * which is the least informative arena this product can open with. Walking one
 * per vendor stays entirely derived from the live list, and it degrades
 * sensibly: if there are fewer than three vendors it falls back to the top of
 * the list.
 */
export const defaultModelSelection = (
  models: readonly CatalogModel[],
): readonly string[] => {
  const oneEachVendor = models.reduce<readonly CatalogModel[]>(
    (picked, model) =>
      picked.some((seen) => seen.providerId === model.providerId)
        ? picked
        : [...picked, model],
    [],
  );

  const remainder = models.filter((model) => !oneEachVendor.includes(model));

  return [...oneEachVendor, ...remainder]
    .slice(0, MAX_SELECTED_MODELS)
    .map((model) => model.id);
};

/**
 * A context window as a size somebody can hold in their head. Kilo here is the
 * round decimal number, not a binary kibi: dividing 1,000,000 by 1024 renders
 * the largest window in the catalog as "977K", which is just wrong-looking.
 */
export const formatContextWindow = (tokens: number): string =>
  tokens >= 1_000_000
    ? `${Number((tokens / 1_000_000).toFixed(1))}M`
    : `${Math.round(tokens / 1000)}K`;
