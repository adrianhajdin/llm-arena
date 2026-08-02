import { ArenaScreen } from "@/features/arena/arena-screen";

/**
 * A saved thread, and the URL feature 8 shares. The id is not read yet: feature
 * 7 loads the real thread here, feature 8 decides who is allowed to see it.
 */
export default function ThreadPage() {
  return <ArenaScreen withTurn />;
}
