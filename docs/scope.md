# Scope: LLM Arena

Send one prompt, watch up to three AI models answer it at the same time, and vote for the best one. Over time those votes and the real per-call numbers, speed, tokens, cost, build an honest leaderboard of which model is actually worth using.

Build it in a thin, working slice first, one prompt actually reaching a model and coming back, before making any single part of it fuller. Then thicken it piece by piece. Before building anything, decide what you're doing and why in a few plain sentences, then build it, and if the plan turns out wrong once it's actually built, say so and fix the plan too, not just the code.

Whenever a "build it" style step actually gets underway, break it into its own short list of what's genuinely being done, and check each part off as it's finished, right in this file. That way this file can be opened fresh, in a brand new conversation, and it's obvious what's already done and what's still left, without anyone re-explaining the feature from scratch.

## Stack

Already decided, nothing open here: Next.js (App Router), TypeScript, Tailwind, shadcn for components (card, button, popover, loading skeleton, and whatever else the UI actually needs as it gets built), Prisma with Postgres, Clerk for auth, Arcjet in front of the endpoint, PostHog for analytics and observability.

## Sketches

There are rough hand-drawn sketches for the arena screen, the leaderboard, and the models page. Treat them as structure only, where things sit, what exists on the page, not as the final design or the actual colors, all of that is already decided elsewhere in this file. If something in a sketch genuinely contradicts what's written here, stop and ask which one actually wins rather than guessing.

## At a glance

| #   | Feature                                     | Phase      | Status                                             |
| --- | ------------------------------------------- | ---------- | -------------------------------------------------- |
| 1   | Connecting to a model                       | Foundation | done, verified end to end                          |
| 2   | Coding standards & tooling                  | Foundation | done, enforcement verified                         |
| 3   | Data model                                  | Foundation | done, verified against the real database           |
| 4   | Design & look                               | Foundation | built, contrast measured, needs an eye check       |
| 5   | Model picker                                | Slice 1    | not started                                        |
| 6   | Send a prompt, parallel streams, and voting | Slice 1    | Arcjet layer built and verified, rest not started  |
| 7   | App shell & thread history                  | Slice 2    | UI built with placeholders, needs a keyboard check |
| 8   | Public thread visibility & sharing          | Slice 3    | not started                                        |
| 9   | Leaderboard: global & personal              | Slice 4    | not started                                        |

## Foundation

### 1. How the app actually connects to a model

The Next.js project itself gets created manually first, `create-next-app`, fast and simple, no reason to spend agent time or tokens on something that easy.

Two real decisions still open once that exists: how the app calls OpenRouter to get a model's answer, and how streaming three models back to the browser at once should actually work. This one's worth real thought: routing all three through one shared connection looks simpler, but if that one connection drops, all three answers die together, which breaks the whole point of one model failing never affecting the others. Decide both properly, then wire them, along with Prisma, Clerk, and Arcjet, into the project that already exists.

PostHog should be wired in from the start too, session replay and heatmaps turned on, and tied to the signed-in user once Clerk resolves, so events are attached to a real person, not left anonymous.

#### Decided

**The Next.js project already exists.** `create-next-app` was run before any of this started, Next 16 App Router, React 19, Tailwind 4, TypeScript strict. That part of this feature was already satisfied on arrival.

**Calling OpenRouter: Vercel AI SDK v7 with `@openrouter/ai-sdk-provider` v3.** Server-side `streamText` per model. Raw `fetch` with hand-parsed SSE was the real alternative and it would have worked, but feature 6 requires PostHog's own per-call LLM analytics, and `@posthog/ai` wraps AI SDK providers directly. Choosing raw fetch here means hand-rolling that tracing later, plus cancellation and usage parsing, to save two dependencies. Not worth it.

**Streaming to the browser: one HTTP request per model, never one shared connection.** Three independent `POST /api/chat` calls, each naming a single model, each returning its own stream. This is the decision the feature description flagged as worth real thought, and it resolves clearly:

- Independent failure is the entire premise of the product. A multiplexed stream means one dropped connection kills all three answers together, and one server handler that must never throw for any model.
- Independent retry falls out for free. A failed model retries on its own while the other two keep streaming, untouched.
- Per-model time-to-first-token and tokens per second get measured on that model's own request, honestly, instead of being inferred from interleaved frames inside a shared envelope.
- Three concurrent requests sits well under the browser's per-origin connection cap, so the simplicity argument for multiplexing buys nothing real.

Timing and token counts travel in the stream itself, so the number on the response card and the number written to the database are the same measured value, not two independent estimates that can drift.

**Environment variables fail fast in `instrumentation.ts`.** A single zod-parsed env module, called at server startup, so a missing key is a loud crash on boot with the variable named, not a confusing runtime error on the first prompt.

_Corrected once built._ The original plan said putting the import inside `register()` would be enough to keep `next build` from needing production secrets. It isn't. `next build` evaluates route modules to collect page data, and `/api/chat` imports the OpenRouter provider, which imports env, so the build demanded real keys and failed. The fix: env is exposed as `serverEnv()`, a memoised function rather than a module-level constant, and the OpenRouter provider and Prisma client are both built lazily on first use. Startup validation still happens, `instrumentation.ts` just calls `serverEnv()` explicitly. Anything added later that reads env or opens a connection at import time will reintroduce this, so keep it lazy.

**Scope correction, agreed before building.** This feature originally read as wiring Prisma, Clerk, Arcjet and PostHog completely. That would quietly make feature 1 the entire foundation. Instead feature 1 _boots_ all four, env validation, Clerk middleware and provider, a Prisma client singleton, PostHog with session replay and Clerk identity, and leaves the parts that genuinely belong to other features where they belong: Arcjet's actual rules ship with the endpoint in feature 6, and the real tables ship with feature 3.

#### What got built

- `infrastructure/env.ts`, zod-parsed server env behind `serverEnv()`, forced at boot by `instrumentation.ts`.
- `infrastructure/database.ts`, lazy Prisma 7 client over the `@prisma/adapter-pg` driver adapter, cached on `globalThis` in development so hot reload doesn't exhaust the connection pool.
- `prisma/schema.prisma`, generator plus one `User` model keyed to `clerkId`. Feature 3 extends this file.
- `proxy.ts`, `clerkMiddleware()`. Next 16 renamed the middleware entry point from `middleware.ts` to `proxy.ts`. It protects nothing yet on purpose, route gating is feature 8's call. _Partly superseded:_ `POST /api/chat` requires sign-in as of feature 6's Arcjet layer, because the rate limit needs a real user to key on. Feature 8 still owns page visibility and sharing.
- `features/analytics/posthog-provider.tsx`, PostHog with session replay and heatmaps on, identifying from Clerk and resetting on sign-out.
- `features/chat/*`, the zod request schema, the OpenRouter provider, the metrics stopwatch, and `streamModelResponse`.
- `app/api/chat/route.ts`, one model per request.

Timings ride back as AI SDK message metadata on the finish chunk: time-to-first-token is stamped at the first `text-delta` via `onChunk`. Cost is a literal `0`, which is the honest measured number here, not a placeholder.

**Tokens per second is wall clock, request to finish, and that is a correction made after measuring.** The original plan measured it over the generating window only, first token to finish, reasoning that a slow model shouldn't be penalised twice for a wait it already reported as TTFT. Measuring three real models proved that wrong. Some providers stream token by token and others buffer the whole answer and flush it at once; against a buffered response the generating window collapses to milliseconds. One real measurement read **23,550 tok/s** for 397 tokens, next to 2.35 tok/s from a model that genuinely streamed. Those two numbers are not the same measurement and cannot share a leaderboard column. Wall clock is the only figure that stays honest across both providers and can never go absurd. It does include the initial wait, which is acceptable because TTFT is displayed separately right beside it. Re-measured after the change: 18.71 and 23.1 tok/s for the same two models, comparable and plausible.

A stray `lib/prisma.ts` was also removed. It was a second Prisma client pointing at the old generator output path, so it broke the typecheck, and it bypassed the env fail-fast with `process.env.DATABASE_URL!`. `infrastructure/database.ts` is the only client.

- [x] Decide the approach
- [x] Install and configure the dependencies
- [x] Env module with fail-fast validation at startup
- [x] Prisma client singleton and a schema that migrates
- [x] Clerk middleware and provider
- [x] PostHog wired, session replay on, identified from Clerk
- [x] `POST /api/chat` streaming one model through the AI SDK
- [x] Typecheck, lint and production build all pass, with no secrets present
- [x] Verified: a malformed body returns a plain sentence and a 400
- [x] Verified: a rejected model call streams a human sentence to the client while the real provider error goes to the server log
- [x] Verified: a missing variable crashes startup and names the variable

#### Verified against real credentials

Confirmed on 2 August 2026, with real keys in `.env.local`, a running dev server, and `curl`.

- Server boots clean with every variable present, loading `.env.local` only.
- Database is real Prisma Postgres at `pooled.db.prisma.io`. Migration `20260802103016_init` is applied and the `users` table exists with the expected four columns.
- OpenRouter key is live. The catalog returns 337 models, 14 of them free tier, which is what feature 5's picker will read.
- **A real prompt reached a real model and streamed back** with true measured metrics: TTFT 982 ms, 21 input / 8 output / 29 total tokens, cost `0`.
- **Independent failure is proven, not assumed.** Three models were called concurrently, two real and one invalid id. Both real models streamed to completion with their own separate metrics while the invalid one failed on its own connection, returning a plain sentence to the client and the real `AI_APICallError` to the server log. Neither survivor was affected.
- Clerk gates the endpoint: an unauthenticated `POST /api/chat` returns 401 and a plain sentence. Clerk and PostHog both load client-side on the rendered page.
- Arcjet reaches genuine decisions with the real key, confirmed as `errored: false, denied: true, reason: ArcjetBotReason`. Bot detection denies non-browser clients outright, which is why `curl` cannot reach the rate limiter at all.

#### Still unverified, and why

- **The token bucket's rate-limit branch never fires for `curl`,** because bot detection denies first. It needs a real browser session, so it gets confirmed when feature 6 puts a UI in front of this endpoint.
- **PostHog events landing in the project.** The script loads and initialises client-side, but nothing has confirmed an event arriving in the dashboard, since that needs a real browser and a signed-in user. Check it when feature 6 ships the first real prompt flow.

### 2. Coding standards & tooling

Write down the real conventions for this project once it actually exists, then install linting, formatting, and a pre-commit hook that actually enforces them.

#### Decided

**The conventions live in `docs/coding-standards.md`, split into what a machine enforces and what a person enforces.** That split is the whole point. Every rule listed as enforced has a config line behind it and was probed to confirm it actually fires; every rule that cannot be honestly linted is written down as a review rule instead of being approximated by a rule that would produce false confidence. "If the same Tailwind classes appear in three places that's a component" and "never show a raw provider error" are both real rules with no honest lint rule behind them, so neither got a fake one.

**Prettier owns formatting, ESLint owns correctness, and they never overlap.** No `eslint-plugin-prettier`, so lint output stays entirely about things that are actually wrong rather than about spacing. `printWidth: 90` was chosen to match the code feature 1 already wrote, so adopting Prettier was a near-no-op diff instead of a repo-wide rewrap. `prettier-plugin-tailwindcss` sorts class lists into one canonical order, which stops class churn from showing up in diffs.

**The pre-commit hook is fast on purpose: `husky` runs `lint-staged` over staged files only.** `eslint --fix --max-warnings=0`, then Prettier. Typecheck and build are deliberately _not_ in the hook. A full `tsc` on every commit grows with the codebase and becomes the thing people skip with `--no-verify`, and a bypassed hook enforces nothing. `CLAUDE.md` already requires typecheck, lint and a real build after every change, which is the right place for them: once, when the change is finished.

**Lint warnings fail.** `pnpm lint` runs with `--max-warnings=0` and so does the hook. A warning nobody has to fix is a rule that does not exist.

**The rules that mechanise this project's actual law**, beyond the defaults:

- `no-explicit-any` raised from warning to error.
- `prefer-const`, `no-var`, `no-param-reassign` with props, for the immutable-data rule.
- **`process.env` banned everywhere except `infrastructure/env.ts` and `infrastructure/public-env.ts`**, with `NODE_ENV` and `NEXT_RUNTIME` exempt because they describe the runtime rather than configure the app. This is the rule that earns its keep: feature 1 records a stray Prisma client that bypassed the fail-fast env validation with `process.env.DATABASE_URL!`, and this makes that a lint error rather than something caught by luck. Config files that run outside Next are exempt, since they cannot import a `server-only` module.
- **Feature boundaries via `no-restricted-imports`:** a feature imports its own files relatively and may not reach into another feature by alias or by climbing out with `../`; `infrastructure/` imports no feature and no route; nothing outside `app/` imports from `app/`. This matches the import style feature 1 already settled into, so it enforces the existing convention rather than imposing a new one.
- The `jsx-a11y` rules worth having as errors, as a floor under the accessibility baseline.
- `no-console` allowing `error` and `warn`, because that is exactly how a real provider error survives server-side while the user sees a plain sentence.

_Correction, found by building it._ The `process.env` ban had one genuine conflict: `features/analytics/posthog-provider.tsx` is a client component and cannot import the `server-only` env module, but Next only inlines browser variables when it sees a literal `process.env.NEXT_PUBLIC_X` access. Rather than granting the feature file an exemption, the read moved to **`infrastructure/public-env.ts`**, the one module that owns browser-visible config. Confirmed after the change that the value is still inlined into the client chunk and no un-inlined `NEXT_PUBLIC_POSTHOG` reference survives the build, so this is a refactor with no behaviour change. Anything added later that needs a `NEXT_PUBLIC_` value adds it there.

Prettier also reformatted the vendored skill docs under `.agents/` on the first run. Reverted, and `.agents/`, `.claude/`, `generated/` and the lockfile are now ignored. Not ours to reformat.

- [x] Decide the approach
- [x] Prettier, `prettier-plugin-tailwindcss`, husky and lint-staged installed and configured
- [x] ESLint extended with the strict, env, boundary and a11y rules
- [x] `format` / `format:check` scripts, `lint` raised to `--max-warnings=0`
- [x] `docs/coding-standards.md` written, linked from `CLAUDE.md`
- [x] Repo formatted, existing code adjusted to satisfy the new rules
- [x] Verified: a probe file with `any`, `var`, a banned `process.env` read, a cross-feature import and a click handler with no keyboard handler trips every rule, while `process.env.NODE_ENV` stays allowed
- [x] Verified: the hook actually blocks. A staged file with `any` fails the commit; a merely misformatted one is fixed and re-staged automatically
- [x] Typecheck, lint, `format:check` and a real production build all pass

### 3. Data model

The core things every feature depends on: users tied to Clerk, threads, each model's own messages inside a thread, and votes. A vote should only ever be possible on a turn where two or more models actually answered.

#### Decided

**The unit is a _turn_, not a flat list of messages.** `User → Thread → Turn → ModelResponse`, with `Vote` hanging off the turn. One turn holds the user's prompt once and fans out to one `ModelResponse` per model. This is what makes "a vote only exists once two or more models answered" expressible at all: a vote attaches to the thing being compared, which is a turn, not to any individual message. A follow-up is simply the next turn, and one model's own separate conversation, which feature 6 requires, is the thread's turns with that model's response taken from each. The alternative, a flat message table with a role column, would store the same prompt three times and give a vote nothing coherent to point at.

**A failed model call is a real row, not an absent one.** `ModelResponse.status` is `STREAMING`, `COMPLETE` or `FAILED`. Dropping failures would quietly let a model that dies often outrank one that answers slowly but always finishes, which is the opposite of the honest leaderboard this product exists to produce.

**The metric columns mirror `ModelResponseMetrics` exactly, nullable in the same places.** Same field names, same nullability, so the number rendered on a response card and the number stored are the same measured value rather than two estimates that drift. `costUsd` is `Decimal(10,6)` and `tokensPerSecond` is `Decimal(10,2)`, not floats, because one is money and the other is a comparison key on the leaderboard.

**No `Model` table.** `modelId` is a string column and the leaderboard groups by it. The catalog is OpenRouter's live free-tier list, which feature 5 reads directly; mirroring 14 rows into Postgres buys a sync problem and nothing else. A `modelName` snapshot rides on each response so an old thread still renders after a model leaves the catalog.

**One vote per turn, owner only, enforced by a plain unique on `turnId`.** Feature 8 says a public viewer sees everything but only the real owner actually uses the thread, so there is no per-user vote on someone else's turn to leave room for.

**The "two or more answers" rule is enforced in application code, inside a transaction, not by the database.** This was the one genuine fork and it was asked rather than assumed. A database-level guarantee would need a denormalized `answeredCount` on the turn, maintained on every response finish, plus hand-written SQL in the migration that the schema file cannot see. That trades a counter which can drift for a guarantee that a single write path already gives. So `features/voting/cast-vote.ts` is that write path and nothing else may insert into `votes`, which is now also written down in `docs/coding-standards.md` as a review rule. The count and the insert share one transaction so two simultaneous clicks cannot both read "two answers", and the unique index on `turnId` is the backstop underneath that.

**Ordering is by `createdAt`, with no position column.** Turns are appended one at a time by a single owner. There is no reordering and no concurrent insert for a position column to protect against.

**No `visibility` column yet.** Public sharing is feature 8's decision; adding a column now would bake in a rule nobody has made.

_Scope correction, agreed before building._ Feature 3 was planned as schema and migration only, with each feature writing its own queries against `@/infrastructure/database`, so nothing gets written on speculation about shapes feature 6 does not have yet. That still holds, with one exception found by building it: choosing application-level enforcement for the vote rule left that rule living nowhere but a comment. `castVote` therefore ships here, because it _is_ the constraint, not a query written ahead of its caller.

#### What got built

- `prisma/schema.prisma`, extended with `Thread`, `Turn`, `ModelResponse`, `Vote` and the `ModelResponseStatus` enum, all `@@map`ped to snake_case tables. `User` gains `threads` and `votes`.
- Migration `20260802112549_arena_data_model`, applied to the real Prisma Postgres.
- `features/voting/cast-vote.ts`, the single transactional write path for a vote, returning a typed refusal (`turn-not-found`, `not-your-thread`, `not-enough-answers`, `already-voted`, `response-not-a-candidate`) rather than throwing, so feature 6 turns each one into a plain sentence.
- Cascades down the whole chain: deleting a user removes their threads, turns, responses and votes.

#### Verified against the real database

A throwaway user was driven through the real shapes features 6 and 9 will use, every constraint was checked by trying to break it, and the whole tree was then cascaded away. Confirmed on 2 August 2026.

- All five tables and the status enum exist; `costUsd` is `numeric(10,6)` and `tokensPerSecond` is `numeric(10,2)`.
- One turn wrote three responses, two complete and one failed. Cost defaulted to a real `0.000000` and speed kept its precision at `18.71`.
- The same model answering the same turn twice is rejected by `model_responses_turnId_modelId_key`.
- A second vote on the same turn is rejected by `votes_turnId_key`, and a vote pointing at a turn that does not exist is rejected by the foreign key.
- Feature 9's actual leaderboard query, grouping by `modelId` with wins joined from votes and average speed over completed answers only, returns the expected `1/1 @ 18.71 tok/s` shape.
- Deleting the user left zero threads, turns, responses and votes.

`castVote` itself was then driven through a temporary route on a running dev server, since this project has no test runner by decision, and the route was deleted afterwards. All six paths behaved: one complete answer plus one failure refuses with `not-enough-answers`; voting for a model that failed refuses with `response-not-a-candidate`; a different user refuses with `not-your-thread`; a made-up turn refuses with `turn-not-found`; the owner with two real answers succeeds and writes exactly one row; voting again refuses with `already-voted`.

- [x] Decide the approach
- [x] Schema extended with threads, turns, per-model responses and votes
- [x] Migration created and applied to the real database
- [x] The vote guard shipped as the single transactional write path
- [x] Verified: every unique, foreign key and cascade holds, checked by trying to break each one
- [x] Verified: the vote guard refuses below two answers, refuses a non-owner, refuses a failed model, and allows exactly one vote
- [x] Typecheck, lint, `format:check` and a real production build all pass

### 4. Design & look

A coffee or dark brown background, warm, not neutral gray or true black. One accent color, rust, used only for things you interact with, buttons, links, focus states, the win-rate bar, never as decoration. Because the background and the accent are both warm tones from the same family, the accent has to stay clearly brighter and more saturated than the background, enough that a button never blends into the page behind it, that's a real risk with two warm colors this close and worth checking by eye, not just by the numbers. Blue, indigo, and purple are never the accent, under any circumstance. Green is reserved only for marking a winner, red only for errors, never reused for anything else. Contrast should genuinely hold up in both light and dark mode, not just look fine at a glance.

#### Decided

**The palette is expressed in OKLCH, and the "accent never blends into the background" rule becomes a number instead of a hope.** Every surface in this app is the same warm hue family, roughly 50–75° hue angle, carrying almost no chroma: the browns sit around `0.014` chroma and only lightness separates them. Rust carries roughly `0.16`. So the accent is never less than **ten times more saturated than any surface it sits on, and at least 0.40 lighter than the page** in dark mode. That gap is the guarantee. It is checked by eye too, on a real screen, because that is what the scope asked for, but it is not left to eye alone.

The dark ladder, which is the design's home: page `oklch(0.19 0.014 55)`, card `oklch(0.23 0.016 55)`, popover `oklch(0.26 0.017 55)`, border `oklch(0.32 0.018 55)`, text `oklch(0.94 0.008 70)`, quiet text `oklch(0.72 0.012 65)`, rust `oklch(0.64 0.16 42)`. Light mode is warm paper, not white: page `oklch(0.97 0.008 75)`, card `oklch(0.99 0.005 80)`, border `oklch(0.88 0.012 70)`, text `oklch(0.22 0.015 50)`, quiet text `oklch(0.48 0.015 55)`, and rust drops to `oklch(0.52 0.17 40)` so it still clears 4.5:1 as link text on cream. **One rust hue, two lightnesses, one per mode.** Not two different accent colors wearing the same name.

**Rust and error red are neighbours on a warm wheel, and that is a real hazard this palette creates.** Rust sits at hue 42, error red at `oklch(0.60 0.20 22)`. Twenty degrees apart is enough to read as different when they are side by side and not always enough in isolation. So **error state is never signalled by color alone**, it always carries a word and an icon, which the "plain human sentence, always" rule already demanded anyway. Same for the winner green, `oklch(0.70 0.13 150)`: a winner is marked with a badge that says so, and the green is confirmation, not the message.

**The token layer adopts shadcn's CSS variable contract, repainted warm, rather than inventing its own names.** shadcn is already in the stack, and every component pulled in later reads `--background`, `--card`, `--border`, `--primary`, `--ring`, `--destructive`, `--muted-foreground`. Inventing a parallel vocabulary means every single component gets hand-patched forever. So those names are ours, they just hold coffee and rust. Three tokens shadcn has no name for get added: `--winner` for the green, `--display` for the serif, and the win-rate bar's track. All of it lives in `globals.css` behind Tailwind 4's `@theme`, which is exactly the "shared values live in `globals.css`" rule, mechanised.

**Typography: Newsreader for display, Geist Sans for everything else, Geist Mono for every measured number, at whatever size that number deserves.** The serif-versus-Geist fork was asked rather than assumed, and the answer was a serif pairing. Two things then changed once the `frontend-design` skill was actually read, and both are corrections worth recording rather than quiet edits:

- **Newsreader replaced Instrument Serif.** The skill names "a warm cream background with a high-contrast serif display and a terracotta accent" as one of exactly three looks AI design defaults to regardless of subject, and that is almost a description of this brief. The palette is not negotiable, it is written above and the skill is explicit that the brief's own words win. But the typeface was a free axis and Instrument Serif is the centre of that cluster. Newsreader is a variable face with an optical-size axis built for reading on screen, so it holds up at both 40px and 18px, and it is not the default answer.
- **The big numbers are mono, not serif, and that is the one deliberate risk in this design.** A product whose entire claim is _real measured numbers_ should let the data face be the display face. Prose is serif, measurement is mono: a win rate at display scale in tabular mono reads like an instrument, and the same figure in serif reads like a magazine pull-quote about a number somebody else measured. It is one token to reverse if it turns out wrong on a real screen.

**Mono means "this is a measured number", never decoration**, and every mono figure carries `tabular-nums` so metrics under a response card do not jitter sideways while tokens are still streaming into them. All three faces load through `next/font`, self-hosted, with fallback metrics, so there is no layout shift.

**The signature element is the instrument strip.** Under each answer, a mono row where TTFT lands first, then speed, tokens and cost settle in, each figure dim until it has genuinely been measured and then settling to full contrast over 150ms. That settle is the only animation in the app. It is where all the boldness gets spent, and it is the one moment this product has that a chat UI does not: you watch the measurement happen. `$0.0000` sits in that row without apology, because a measured zero is still a measured number.

**Theme is class-based via `next-themes`, defaulting to the system setting.** The sketch puts an explicit toggle in the sidebar footer, and a real toggle cannot be built on `prefers-color-scheme` alone, so the media-query block currently in `globals.css` gets replaced by a `.dark` class on `<html>`. Dark is where this design lives, but light is a first-class mode held to the identical contrast floor, not an afterthought that merely renders.

**Hairline borders do the separating, not shadows.** A drop shadow on a dark brown surface is invisible and still costs a paint. Surfaces are distinguished by one lightness step plus a 1px warm border. Radius is a small scale off a single `--radius` of 10px, cards 12px, pills full round, nothing sharper.

**Motion is close to nothing on purpose.** Streaming text just appears, with a caret, no shimmer chrome over the top of the actual product moment. Skeletons appear only where there is a genuine wait with a known shape, the leaderboard table on first load. Transitions cap at 150ms and `prefers-reduced-motion` removes them entirely.

**The accessibility floor, which is a gate and not an aspiration:** body text at 4.5:1 and borders and large text at 3:1, in both modes; a 2px rust focus ring with a 2px offset visible on every interactive element in both modes, and `outline: none` never appears without a replacement ring in the same rule; full keyboard operation of the toggle, the picker, and the vote buttons; color never the sole carrier of meaning, per the rust-versus-red hazard above.

**What "build it" means here is the token layer plus one throwaway page that proves it.** No feature screens, those belong to features 5 through 9. The proof page replaces the `create-next-app` contents of `app/page.tsx` and shows, on one screen, the surface ladder, the type scale, buttons in every state including focus, a fake response card with mono metrics, a fake leaderboard row with the win-rate bar, a winner badge, and an error state, in both themes. It exists because "check by eye that a button never blends into the page" is not something reading CSS can answer. Feature 6 and 9 delete it when the real screens land.

**Not doing:** no per-model brand colors, the scope already parked that; no third theme; no CSS-in-JS; no shadcn components installed on speculation, each one arrives with the feature that needs it.

#### What got built

- `app/globals.css`, the whole token layer. Both modes, shadcn's variable contract repainted warm, the type roles, the focus ring, the `tabular-nums` rule, and the `prefers-reduced-motion` reset. Four component classes for patterns that would otherwise be copy-pasted Tailwind in three places: `.text-display`, `.text-eyebrow`, `.text-readout`, `.metric` and `.surface`.
- `app/layout.tsx`, Newsreader added beside Geist Sans and Geist Mono, `suppressHydrationWarning` for the theme class.
- `features/theme/`, the `next-themes` provider and the toggle.
- `infrastructure/ui.ts` with `cn`, and `components.json` pointing shadcn at these tokens, so `shadcn add` later generates against the real palette instead of running `init` and overwriting `globals.css`.
- `app/page.tsx` and `app/instrument-strip.tsx`, the temporary proof page.

#### Verified

**The palette was measured before a line of CSS was written, and measuring changed it twice.** A script converted every OKLCH value to sRGB and computed real WCAG ratios. Two failures, both fixed:

- The first error red, `oklch(0.6 0.19 22)`, read **3.88:1** on a card and failed the 4.5 floor. It is now `oklch(0.68 0.19 18)` at 5.37:1.
- The first light-mode rust, `oklch(0.52 0.17 40)`, was **outside the sRGB gamut** and would have been silently clipped to something other than the chosen colour. It is now `oklch(0.52 0.15 40)`, in gamut, 5.40:1 on paper.

The final run is 24 pairings, all pass: body text 15.5:1 dark and 15.9:1 light, quiet text 7.4:1 and 6.0:1, rust as link text 4.7:1 and 5.4:1, a label on a rust button 5.2:1 and 5.7:1, winner green 6.7:1 and 6.0:1, error red 5.4:1 and 6.5:1, and control edges 3.3:1 and 3.6:1 against the surfaces they sit on. The scope's own separation rule holds numerically: rust is 0.45 lighter than the page and carries 11× the chroma of any surface in dark, 19× in light.

**The rust-versus-red hazard is now a measured figure, not a worry.** They contrast **1.14:1** against each other in dark and 1.13:1 in light. That is near-identical luminance, so they are told apart by hue alone and are effectively the same colour to a red-orange deficiency. Hence the rule: colour is never the only signal, the error carries an icon and a sentence, and the winner carries the word.

**A real flaw found by inspecting the served CSS rather than by reading the source.** The focus ring was written as Tailwind's `ring-2`, which compiles to `box-shadow`, and a box-shadow ring is clipped by any `overflow-hidden` ancestor. Response cards and leaderboard rows are exactly that, so a focused control inside one would have lost its ring entirely. It is now a real `outline` with `outline-offset`, which nothing clips.

Also confirmed against a running dev server: the page returns 200 with zero errors in the log, all three font families ship with fallback metrics, `--font-display` resolves, `tabular-nums` is present, and Lightning CSS emits hex fallbacks alongside the OKLCH that match the measured swatches exactly, `#d96533` dark rust and `#ad4216` light.

- [x] Decide the approach
- [x] Fonts wired in `layout.tsx`, `--font-display` added
- [x] `globals.css` rewritten as the token layer, both modes, shadcn contract
- [x] shadcn pointed at these tokens, `cn` in place, no components yet
- [x] `next-themes` wired, `.dark` on `<html>`, toggle in `features/theme/`
- [x] Proof page on `/`, every state
- [x] Verified: contrast measured, not guessed, 24 pairings in both modes, two real failures found and fixed
- [x] Verified: the focus ring survives an `overflow-hidden` card, after being rewritten because it did not
- [x] Typecheck, lint, `format:check` and a real production build all pass
- [ ] **Needs a person:** confirm by eye in a real browser that rust never sinks into the brown, in both themes, and tab the proof page to see the ring on every control

## Slice 1: Core arena loop

### 5. Model picker

An "Add model" popover pulling OpenRouter's live free-tier list, sorted by context window, capped at three models, defaulting to all three selected, with removable chips next to the prompt box. Also render that same catalog as a simple `/models` page, name, context window, and pricing for each one, so anyone can browse the full list without opening the picker.

- [ ] Decide the approach
- [ ] Build it

### 6. Send a prompt, parallel streams, and voting

The heart of the product. One prompt goes to every selected model at once, each streaming and failing independently, so one being slow or down never blocks the others. Each answer shows its own real time-to-first-token, tokens per second, and total tokens. No cost shown, every model here is free tier, so it would always read zero. A vote only exists once two or more models have answered, and picking one writes exactly one vote and marks that answer as the winner, while every answer stays visible the whole time. A follow-up continues each model's own separate conversation.

Arcjet sits in front of this endpoint before any model is ever called: rate limiting, bot protection, and a shield against prompt injection, plus a real limit on how much one person can use across all three models at once, not just a limit on the endpoint overall.

Every prompt sent, every answer finishing, and every vote cast should be tracked as a real PostHog event, so there's an honest funnel from prompt to answer to vote. A model failing should also be logged properly on the server, not just shown to the user and forgotten. Separately from that funnel, every actual model call should also be wrapped so PostHog captures its own real tokens, cost, and latency per call, that's PostHog's own LLM analytics, not the same thing as the funnel events or the numbers already shown on the response card.

#### Decided: the Arcjet layer, built ahead of the rest of this feature

Arcjet shipped early, on its own, because the endpoint it guards already existed from feature 1 and there was no reason to leave it open while the UI gets built.

**A shared client holds only Shield, route rules layer on with `withRule()`.** `infrastructure/arcjet.ts` exposes a lazy, memoised client carrying `shield({ mode: "LIVE" })` and nothing else. Shield is free and every route wants it. Chat's own rules live in `features/chat/chat-protection.ts`, so one endpoint's rate limit can never silently apply to another. The client is built on first use, not at import, for exactly the reason feature 1 records: `next build` evaluates route modules, and a build must not demand real secrets.

**The rate limit is a token bucket keyed on the Clerk `userId`, not the endpoint or the IP.** Capacity 30, refilling 15 per 60 seconds, one token per call. The browser sends one request per model, so a three-model turn spends three tokens and a one-model turn spends one, which is what makes this a limit on a person's total usage across all three models rather than a per-model allowance that triples the moment someone picks a third model. A fixed or sliding window on the endpoint cannot express that. Measured: exactly 30 calls pass, the 31st returns 429 with a `retry-after` header, and a second user is unaffected.

**`POST /api/chat` now requires sign-in.** No Clerk `userId` means a 401 before Arcjet is called at all, which also means an unauthenticated request never costs a decision. _This contradicts feature 1, which parked route gating in feature 8, and the contradiction is resolved here rather than worked around:_ the rate limit has no honest identity without an authenticated user, and IP keying would have quietly broken the "one person" promise above the moment two people shared a NAT. Feature 8 still owns page visibility and public thread sharing. The cost, accepted deliberately: nobody can try the arena without an account, so there is no signed-out demo.

**The guard runs before the body is parsed.** Nothing in it needs the body, and this ordering means malformed-body spam still spends a token instead of being a free way to hammer the endpoint.

**Bots are denied outright, `allow: []`.** This endpoint is only ever called by our own browser code. No crawler, monitor, or search engine has a reason to reach it, and everything it lets through spends real inference.

_Plan correction, found by building it._ This feature asked for "a shield against prompt injection" and that is **not shipped**. Arcjet bills prompt scanning as a usage-based add-on ($2 per 1M tokens) rather than including it in a plan, and on an account without it the rule does not degrade quietly: the server answers "Unable to detect prompt injection", the entire decision comes back `ERROR`, and every prompt pays a round trip for protection it never receives. Verified directly, then removed, and the dev log went from an error on every call to zero. Re-enabling it is two lines, documented in place in `chat-protection.ts`, once the add-on is actually on the account. Shipping it broken would have looked like protection while providing none, which is worse than not having it.

Denials never leak an Arcjet reason: 429 with a real retry-after for the bucket, 403 otherwise, each a plain sentence. `isErrored()` logs server-side and lets the request through, so an Arcjet outage degrades to an unprotected endpoint rather than a dead one.

- [x] Decide the approach _(Arcjet layer only)_
- [x] Arcjet client, chat rules, and `ARCJET_KEY` in the fail-fast env schema
- [x] Verified: no `ARCJET_KEY` crashes at boot naming the variable
- [x] Verified: unauthenticated `POST /api/chat` returns 401
- [x] Verified: plain `curl` is denied 403 by the bot rule, confirmed as `REASON_BOT_V2` in the Arcjet console
- [x] Verified: 30 calls pass, then 429 with `retry-after`, and a second user is unaffected
- [x] Typecheck, lint and production build all pass
- [ ] **Needs a paid add-on:** prompt injection detection, see the correction above
- [ ] Build the rest of the feature: parallel streams, the response cards, and voting

## Slice 2: App shell & thread history

### 7. App shell & thread history

The frame everything else sits inside: a top bar and sidebar that stay in place while the page scrolls, the thread's name, and each model's win record shown right there (shrinking down to a small dot and number if it gets crowded). The sidebar lists a signed-in user's own past threads so the tool actually feels usable across visits, not just in one sitting.

#### Decided

**Built out of order, on purpose, and as UI only.** This is slice 2 arriving before slice 1 because the shell is the frame every other screen needs to sit inside, and building the arena first means building it twice. Everything behind the frame is a labelled placeholder: no live catalog, no streaming, no persisted thread, no real vote. Features 5, 6 and 7 replace those in place.

**Routes, and this was the one genuine fork here because feature 8 makes every thread URL a link somebody pastes elsewhere.** The arena is the product, so it sits at the root with no redirect in front of it, and a saved thread gets a short path:

- `/` the arena, a new thread
- `/t/[threadId]` a saved thread, and the URL feature 8 shares
- `/leaderboard` and `/models`

The breadcrumb still reads "Arena / Thread 1" as sketched. It says where you are; it does not have to mirror the path, and paying a redirect on every visit to the root to make it do so is a bad trade.

**The shell lives in a route group, `app/(shell)/layout.tsx`, not in the root layout.** The root layout owns providers and has to stay wrappable around things that must not get a sidebar, a sign-in screen among them. A route group gives the four real screens the frame and leaves that door open.

**The sidebar is written here rather than pulled from shadcn.** shadcn's sidebar block ships its own eight-colour token set, a cookie persistence layer and a provider, all of which would have to be repainted and reconciled against the palette feature 4 just settled. The sketch is a nav list, a thread list, and a footer. Writing it costs less than adapting it, and it reads the tokens we already have. shadcn still owns the popover, button and skeleton when features 5 and 6 need them.

**The shell's signature element is the standings strip in the top bar.** The sketch already asked for it, and it is the most characteristic thing in this product's world: a running scorecard pinned to the top of the venue. One chip per model in this thread, the model's initial in a ring, its record in tabular mono, updating as votes land. Below a comfortable width the label drops and the chip becomes the ring plus the number, which is exactly the shrink the feature description asked for. Everything else in the shell stays deliberately quiet so this is the thing the eye goes to.

**The thread list groups by recency, and does not number itself.** "Today", "This week", "Earlier". Grouping encodes something true, that a thread from an hour ago and one from last month are different kinds of thing. Numbering would encode a sequence that does not exist. Same reasoning the leaderboard's rank numbers _do_ earn their place: there, order is the content.

**The shell renders for everyone, signed in or not, and gates nothing.** Feature 8 owns page visibility and public sharing, and quietly making a routing decision here would pre-empt it. Signed out, the nav and all three screens still work; the thread list shows a sign-in invitation instead of a list, because a thread list is the one part that genuinely cannot exist without an account. Clerk's user button sits in the sidebar footer beside the theme toggle, per the sketch.

**Responsive and keyboard behaviour, which the accessibility baseline makes a requirement and not a nicety.** The sidebar is persistent from `lg` up and an overlay drawer below it, driven by the same toggle the sketch puts in the top bar. The drawer closes on Escape and on navigation, moves focus into itself when it opens, and returns focus to the toggle when it closes. Every screen gets a skip link to its main content, the active nav item carries `aria-current`, and the top bar and sidebar are landmarks with real labels.

**Placeholder data sits where the real thing will live, one file per feature that replaces it,** so feature 5 deletes one import and feature 6 deletes another, rather than someone hunting fake model names through the tree. Each file says in a comment which feature kills it.

**The style proof page moves to `/design`, unlinked from the nav.** It is still the only way to eye-check the palette, and the root is now the arena. It dies when features 6 and 9 put the real screens in place, same as before.

#### What got built

- `features/shell/`, the frame: `app-shell.tsx` (drawer state, Escape, focus move and return, skip link), `sidebar.tsx`, `top-bar.tsx`, `standings-strip.tsx`, `icons.tsx`, and two placeholder data files.
- `app/(shell)/`, the route group and all five pages: `/`, `/t/[threadId]`, `/leaderboard`, `/models`, and `/design`.
- `features/arena/`, `features/leaderboard/`, `features/models/`, one placeholder screen and one placeholder data file each, every one of them opening with a comment naming the feature that deletes it.
- The style proof moved from `/` to `/design` and lost its own theme toggle, since the shell now carries one.

_Correction, found by building it._ **Clerk 7 has no `SignedIn` or `SignedOut`.** They were replaced by a single `<Show when="signed-in">`, which is a **server** component returning a promise, so a client component cannot use it. The sidebar has to be a client component, it reads `usePathname` for the active item and closes the drawer on navigation, so its signed-in state comes from the `useAuth()` hook instead, and the sidebar footer, which is composed in the server layout, uses `<Show>`. Worth writing down because the obvious import is the one that no longer exists.

**A deliberate departure from the sketch, flagged rather than assumed.** The sketch puts each column's metrics behind a "Metrics" toggle. They are open here instead. Feature 4 made the instrument strip the signature element on the argument that the measured numbers are the reason this product exists, and putting the best thing on the screen behind a disclosure contradicts that. This is the softer kind of sketch conflict, not a structural one, so it was decided rather than escalated — but it is a real change from what was drawn, and putting the toggle back is a small edit if the drawing wins.

**Icons are drawn in `features/shell/icons.tsx` rather than pulled from a package.** The shell needs six glyphs. A dependency that ships a thousand to deliver six is a bad trade, and every icon inherits `currentColor` so an icon is never a second place a colour gets decided.

#### Verified

Against a running dev server, all five routes return 200 with zero errors or warnings in the log. Confirmed in the rendered HTML: the breadcrumb reads "Arena / Thread f3a9c1" on a thread, the standings strip renders there and correctly does **not** render on `/`, since a brand-new thread has no record yet; the skip link, both `nav` landmarks with real labels, and `aria-current="page"` on the active nav item as well as the final breadcrumb; the leaderboard's four rows compute 72 / 54 / 37 / 20 percent from the placeholder counts and carry a table caption; the models grid renders all six cards.

- [x] Decide the approach
- [x] `app/(shell)/layout.tsx` with the sidebar, top bar, and skip link
- [x] Sidebar: nav, thread list grouped by recency, signed-out state, footer with user button and theme toggle
- [x] Top bar: sidebar toggle, breadcrumb, the standings strip
- [x] Drawer behaviour below `lg`, Escape, focus move and return
- [x] The five routes, with labelled placeholder content on each
- [x] Style proof moved to `/design`
- [x] Verified: every route responds, landmarks and `aria-current` present, no server errors
- [x] Typecheck, lint, `format:check` and a real production build all pass
- [ ] **Needs a person:** open a narrow window, confirm the drawer opens, Escape closes it, focus returns to the toggle, and a link inside it closes it. Check both themes.

## Slice 3: Public visibility & sharing

### 8. Public thread visibility & sharing

Anyone should be able to open a thread's link and see it, without an account, that's what actually makes it shareable. Only sending a prompt and voting need sign-in. A made-up or deleted thread just shows a plain not-found page either way. The thread's real owner sees everything everyone else sees, plus the ability to actually use it.

- [ ] Decide the approach
- [ ] Build it

## Slice 4: Leaderboard

### 9. Leaderboard: global & personal

Two leaderboards from the same votes, one for everyone, one just for the signed-in user. Each row's win rate is the big, bold number, in the accent color, with a small bar next to it, always written as "won 4 of 5," never a bare percentage or a made-up score. Smaller, quieter numbers underneath for average speed and time-to-first-token, each clearly labeled. No cost or "cheapest" stat, every model is free, so that number never means anything here. First place gets a subtle highlight, nobody else does.

- [ ] Decide the approach
- [ ] Build it

## Not doing right now

Kept here so the plan stays honest about what's deliberately left out.

- A "fastest" label on the leaderboard, tagging whichever model already has the best average speed, only for models with enough votes to mean anything. Nice to have, not required.
- Giving each model's own little icon a distinct look instead of plain gray. Nice to have, not required.
- Privacy policy and terms pages.
- Rich link previews when a thread gets shared somewhere.
- Any kind of admin or moderation page.
- A public API for the leaderboard data. Nobody's asked for this.
