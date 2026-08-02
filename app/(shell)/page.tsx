import { ArenaScreen } from "@/features/arena/arena-screen";
import { castVoteAction } from "@/features/voting/cast-vote-action";
import { fetchFreeModelCatalog } from "@/infrastructure/fetch-model-catalog";
import { defaultModelSelection } from "@/infrastructure/model-catalog";

/**
 * A new thread. Sending a prompt here creates it and navigates to it.
 *
 * `castVoteAction` is `features/voting`'s own logic; this route is the layer
 * that is allowed to know about both `features/arena` and `features/voting`
 * and wire them together, so it is passed down rather than imported inside
 * the arena feature itself.
 */
export default async function ArenaPage() {
  const catalog = await fetchFreeModelCatalog();

  return (
    <ArenaScreen
      catalog={catalog}
      defaultSelection={catalog ? defaultModelSelection(catalog) : []}
      onCastVote={castVoteAction}
    />
  );
}
