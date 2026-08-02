import "server-only";

import { parseFreeModels, type CatalogModel } from "@/infrastructure/model-catalog";

/**
 * The effectful half of the catalog: one call to OpenRouter, on the server.
 *
 * The models endpoint is public, so no key travels with this request. That is
 * worth stating rather than looking like an oversight.
 *
 * Cached for an hour. This list changes on the order of weeks, and a
 * third-party round trip in front of every page render would be a real cost
 * paid for no freshness anybody can perceive.
 *
 * Returns `null` rather than throwing, because every caller owes the user a
 * plain sentence and a retry, not a stack trace. The real reason goes to the
 * server log.
 */
const CATALOG_URL = "https://openrouter.ai/api/v1/models";
const CATALOG_TTL_SECONDS = 3600;

export const fetchFreeModelCatalog = async (): Promise<
  readonly CatalogModel[] | null
> => {
  try {
    const response = await fetch(CATALOG_URL, {
      headers: { Accept: "application/json" },
      next: { revalidate: CATALOG_TTL_SECONDS },
    });

    if (!response.ok) {
      console.error(
        `[model-catalog] OpenRouter answered ${response.status} ${response.statusText}`,
      );

      return null;
    }

    const models = parseFreeModels(await response.json());

    if (!models || models.length === 0) {
      console.error("[model-catalog] the catalog parsed to nothing usable");

      return null;
    }

    return models;
  } catch (error) {
    console.error("[model-catalog] could not reach OpenRouter", error);

    return null;
  }
};
