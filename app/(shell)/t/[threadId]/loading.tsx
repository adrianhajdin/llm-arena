import { ThreadSkeleton } from "@/features/arena/arena-skeleton";

/**
 * The wait this whole boundary was added for: a brand-new thread's first prompt
 * navigates here, and this render has to finish before the arena can mount and
 * open its model streams. See the hardening note in `docs/scope.md`.
 */
export default function ThreadLoading() {
  return <ThreadSkeleton />;
}
