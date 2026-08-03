/**
 * What the arena looks like before its data arrives.
 *
 * Feature 4 allows a skeleton only "where there is a genuine wait with a known
 * shape", which is the rule that decides everything here: these mirror the real
 * geometry of `arena-screen.tsx` — the same container, the same three-column
 * bordered surface, the same composer height — so the frame does not jump when
 * the real screen replaces them. A generic spinner would have satisfied the
 * wait and failed the shape.
 *
 * They live in the arena feature rather than in `app/`'s `loading.tsx` files for
 * the ordinary reason: this is arena geometry, and it has to change in the same
 * commit the arena's layout changes. Two routes need it — `/` and
 * `/t/[threadId]` — and the composer shell is common to both, which is exactly
 * the case for one shared module over markup copied into two route files.
 *
 * The whole visual scaffold is `aria-hidden`, with one `sr-only` sentence
 * carrying the actual message. A skeleton is decoration that announces a wait;
 * read aloud it is a table of nothing, and the sentence is the honest version of
 * the same information.
 */
const RESPONSE_COLUMNS = [0, 1, 2] as const;

/** The prompt box, present and correctly sized but not yet operable. */
const ComposerSkeleton = () => (
  <div className="bg-background/85 sticky bottom-0 px-4 pt-2 pb-4 backdrop-blur-sm sm:px-6">
    <div className="surface mx-auto max-w-5xl p-3">
      <div className="flex flex-col gap-2 px-1 py-1">
        <div className="skeleton h-4 w-full max-w-md" />
        <div className="skeleton h-4 w-full max-w-64" />
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="skeleton h-6 w-28 rounded-full" />
          <div className="skeleton h-6 w-24 rounded-full" />
          <div className="skeleton h-6 w-32 rounded-full" />
        </div>
        <div className="skeleton size-9 shrink-0 rounded-lg" />
      </div>
    </div>
  </div>
);

/** A brand-new thread: the hero, then the composer. Nothing has been asked yet. */
export const ArenaSkeleton = () => (
  <div className="flex min-h-full flex-col" aria-busy="true">
    <p role="status" className="sr-only">
      Loading the arena
    </p>

    <div className="flex-1 px-4 py-6 sm:px-6" aria-hidden>
      <div className="mx-auto flex max-w-xl flex-col items-center py-20">
        <div className="skeleton h-10 w-full max-w-sm" />
        <div className="mt-5 flex w-full flex-col items-center gap-2.5">
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-full max-w-md" />
          <div className="skeleton h-4 w-full max-w-64" />
        </div>
      </div>
    </div>

    <ComposerSkeleton />
  </div>
);

/**
 * A saved thread: one turn's worth of shape. Deliberately one turn and three
 * columns regardless of what the thread actually holds — the count is unknown
 * until the query returns, and guessing high would make a one-model thread
 * collapse visibly the moment it loaded.
 */
export const ThreadSkeleton = () => (
  <div className="flex min-h-full flex-col" aria-busy="true">
    <p role="status" className="sr-only">
      Loading this thread
    </p>

    <div className="flex-1 px-4 py-6 sm:px-6" aria-hidden>
      <div className="mx-auto flex max-w-5xl flex-col gap-5">
        {/* The prompt, right-aligned, wearing the bubble's own corners. The
            bubble is `bg-muted` and so is a skeleton, so this is one block in
            the bubble's shape rather than a block nested inside a bubble, which
            would have been invisible against it. */}
        <div className="flex justify-end">
          <div className="skeleton h-10 w-52 rounded-2xl rounded-br-md" />
        </div>

        <div className="surface overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-3">
            {RESPONSE_COLUMNS.map((column) => (
              <div
                key={column}
                className="border-border flex min-w-0 flex-col border-b last:border-b-0 lg:border-r lg:border-b-0 lg:last:border-r-0"
              >
                <div className="flex items-center gap-2 px-4 py-3">
                  <div className="skeleton size-6 shrink-0 rounded-full" />
                  <div className="skeleton h-4 w-28" />
                </div>
                <div className="min-h-32 flex-1 space-y-2.5 px-4 pb-4">
                  <div className="skeleton h-3.5 w-full" />
                  <div className="skeleton h-3.5 w-full" />
                  <div className="skeleton h-3.5 w-4/5" />
                  <div className="skeleton h-3.5 w-11/12" />
                  <div className="skeleton h-3.5 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>

    <ComposerSkeleton />
  </div>
);
