import { InstrumentStrip } from "@/features/arena/instrument-strip";

/**
 * Temporary, and deliberately not in the nav. This page exists so the design
 * decisions in `docs/scope.md` feature 4 can be checked with eyes rather than
 * read as CSS: whether rust ever sinks into the brown, whether the focus ring
 * survives both themes, whether the measured numbers hold their columns.
 * Features 6 and 9 delete it once the real screens carry that proof themselves.
 */

const SURFACES = [
  { token: "background", label: "page", className: "bg-background" },
  { token: "card", label: "a response, a row", className: "bg-card" },
  { token: "popover", label: "the model picker", className: "bg-popover" },
  { token: "border", label: "a divider", className: "bg-border" },
  { token: "input", label: "an edge you can operate", className: "bg-input" },
  { token: "primary", label: "rust, interactive only", className: "bg-primary" },
] as const;

const Section = ({
  eyebrow,
  title,
  children,
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly children: React.ReactNode;
}) => (
  <section className="border-border border-t pt-10">
    <p className="text-eyebrow">{eyebrow}</p>
    <h2 className="font-display mt-1 mb-6 text-2xl tracking-tight">{title}</h2>
    {children}
  </section>
);

export default function StyleProof() {
  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-12 sm:px-10">
      <header className="mb-14">
        <p className="text-eyebrow">Design proof</p>
        <h1 className="text-display mt-2">LLM Arena</h1>
        <p className="text-muted-foreground mt-3 max-w-lg text-[15px] leading-relaxed">
          Prose is set in serif. Every number a machine measured is set in mono, at
          whatever size the number deserves. Rust marks the things you can operate and
          nothing else.
        </p>
      </header>

      <div className="flex flex-col gap-14">
        <Section eyebrow="Colour" title="One warm family, one accent">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {SURFACES.map((surface) => (
              <div key={surface.token} className="surface overflow-hidden">
                <div className={`${surface.className} h-16 w-full`} />
                <div className="border-border border-t px-3 py-2">
                  <p className="font-mono text-xs">{surface.token}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">{surface.label}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
            Rust sits 0.45 lighter than the page and carries eleven times the chroma of
            any surface, which is what stops a button from sinking into the brown behind
            it.
          </p>
        </Section>

        <Section eyebrow="Type" title="Serif for words, mono for measurements">
          <div className="flex flex-col gap-5">
            <p className="text-display">A leaderboard nobody paid for</p>
            <p className="font-display text-2xl italic">
              Every model&rsquo;s real record, from actual votes
            </p>
            <p className="max-w-xl text-[15px] leading-relaxed">
              Body copy is Geist, quiet on purpose. It is the delivery vehicle, not the
              personality, and it has to stay readable through a long streamed answer.
            </p>
            <p className="text-readout text-primary">71%</p>
            <p className="text-eyebrow">Eyebrow, for labelling a section</p>
          </div>
        </Section>

        <Section eyebrow="Controls" title="Every state, including focus">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              Send prompt
            </button>
            <button
              type="button"
              className="border-input hover:bg-muted rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
            >
              Add model
            </button>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground rounded-lg px-3 py-2 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled
              className="border-border text-muted-foreground rounded-lg border px-4 py-2 text-sm font-medium opacity-50"
            >
              Vote
            </button>
            <a
              href="#focus"
              className="text-primary text-sm font-medium underline underline-offset-4"
            >
              A link is rust too
            </a>
          </div>
          <p className="text-muted-foreground mt-4 text-sm" id="focus">
            Tab through these. The ring is rust, two pixels, offset from the control, and
            it appears on every one of them in both themes.
          </p>
        </Section>

        <Section eyebrow="Arena" title="A response, mid-stream">
          <div className="surface overflow-hidden">
            <div className="border-border flex items-center justify-between gap-4 border-b px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span className="border-input text-muted-foreground flex size-7 items-center justify-center rounded-full border font-mono text-xs">
                  N
                </span>
                <span className="font-display text-lg">NVIDIA: Nemotron 3 Ultra</span>
              </div>
              <span className="bg-winner/15 text-winner inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium">
                <svg
                  viewBox="0 0 16 16"
                  className="size-3.5"
                  fill="currentColor"
                  aria-hidden
                >
                  <path d="M6.6 11.4 3.8 8.6l1.1-1.1 1.7 1.7 4.5-4.5 1.1 1.1z" />
                </svg>
                Winner
              </span>
            </div>
            <p className="px-4 py-4 text-[15px] leading-relaxed">
              A streamed answer lands here. There is no shimmer over the top of it,
              because the text arriving is already the thing worth watching.
            </p>
            <div className="border-border bg-background/40 border-t px-4 py-3">
              <InstrumentStrip />
            </div>
          </div>
          <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
            Cost reads $0.0000 because every model here is free, and that is the measured
            number, not a placeholder. It stays on screen for the same reason the rest do.
          </p>
        </Section>

        <Section eyebrow="Leaderboard" title="The record, written as a record">
          <div className="surface overflow-hidden">
            <div className="text-eyebrow border-border grid grid-cols-[2rem_1fr_9rem] gap-4 border-b px-4 py-2.5">
              <span>#</span>
              <span>Model</span>
              <span>Win rate</span>
            </div>
            {[
              { rank: 1, name: "NVIDIA: Nemotron 3 Ultra", pct: 71, won: 507, of: 700 },
              { rank: 2, name: "Meta: Llama 4 Scout", pct: 54, won: 302, of: 559 },
            ].map((row) => (
              <div
                key={row.rank}
                className="border-border grid grid-cols-[2rem_1fr_9rem] items-center gap-4 border-b px-4 py-3 last:border-b-0"
              >
                <span className="font-mono text-sm">{row.rank}</span>
                <span className="font-display text-lg">{row.name}</span>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-primary font-mono text-2xl font-medium">
                      {row.pct}%
                    </span>
                    <span className="metric">
                      won {row.won} of {row.of}
                    </span>
                  </div>
                  <div className="bg-muted mt-1.5 h-1 w-full overflow-hidden rounded-full">
                    <div className="bg-primary h-full" style={{ width: `${row.pct}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section eyebrow="Failure" title="A plain sentence and a way out">
          <div className="border-destructive/40 bg-destructive/8 rounded-xl border px-4 py-3.5">
            <p className="text-destructive flex items-center gap-2 text-sm font-medium">
              <svg viewBox="0 0 16 16" className="size-4" fill="currentColor" aria-hidden>
                <path d="M8 1.5 15 14H1zm0 4.2a.8.8 0 0 0-.8.85l.25 3.1a.55.55 0 0 0 1.1 0l.25-3.1A.8.8 0 0 0 8 5.7m0 5.1a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6" />
              </svg>
              This model did not answer
            </p>
            <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
              The other two are still going. Try this one again, or vote on what you have.
            </p>
            <button
              type="button"
              className="border-input hover:bg-muted mt-3 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors"
            >
              Try again
            </button>
          </div>
          <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
            Rust and this red measure 1.14:1 against each other, so they are told apart by
            hue alone. That is why the error carries an icon and a sentence, and the
            winner above carries the word &ldquo;Winner&rdquo;. Colour is never the only
            signal here.
          </p>
        </Section>
      </div>
    </div>
  );
}
