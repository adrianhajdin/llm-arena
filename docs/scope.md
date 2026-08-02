# Scope: LLM Arena

Send one prompt, watch up to three AI models answer it at the same time, and vote for the best one. Over time those votes and the real per-call numbers, speed, tokens, cost, build an honest leaderboard of which model is actually worth using.

Build it in a thin, working slice first, one prompt actually reaching a model and coming back, before making any single part of it fuller. Then thicken it piece by piece. Before building anything, decide what you're doing and why in a few plain sentences, then build it, and if the plan turns out wrong once it's actually built, say so and fix the plan too, not just the code.

Whenever a "build it" style step actually gets underway, break it into its own short list of what's genuinely being done, and check each part off as it's finished, right in this file. That way this file can be opened fresh, in a brand new conversation, and it's obvious what's already done and what's still left, without anyone re-explaining the feature from scratch.

## Stack

Already decided, nothing open here: Next.js (App Router), TypeScript, Tailwind, shadcn for components (card, button, popover, loading skeleton, and whatever else the UI actually needs as it gets built), Prisma with Postgres, Clerk for auth, Arcjet in front of the endpoint, PostHog for analytics and observability.

## Sketches

There are rough hand-drawn sketches for the arena screen, the leaderboard, and the models page. Treat them as structure only, where things sit, what exists on the page, not as the final design or the actual colors, all of that is already decided elsewhere in this file. If something in a sketch genuinely contradicts what's written here, stop and ask which one actually wins rather than guessing.

## At a glance

| #   | Feature                                     | Phase      | Status      |
| --- | ------------------------------------------- | ---------- | ----------- |
| 1   | Connecting to a model                       | Foundation | done, verified end to end |
| 2   | Coding standards & tooling                  | Foundation | not started |
| 3   | Data model                                  | Foundation | not started |
| 4   | Design & look                               | Foundation | not started |
| 5   | Model picker                                | Slice 1    | not started |
| 6   | Send a prompt, parallel streams, and voting | Slice 1    | Arcjet layer built and verified, rest not started |
| 7   | App shell & thread history                  | Slice 2    | not started |
| 8   | Public thread visibility & sharing          | Slice 3    | not started |
| 9   | Leaderboard: global & personal              | Slice 4    | not started |

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

*Corrected once built.* The original plan said putting the import inside `register()` would be enough to keep `next build` from needing production secrets. It isn't. `next build` evaluates route modules to collect page data, and `/api/chat` imports the OpenRouter provider, which imports env, so the build demanded real keys and failed. The fix: env is exposed as `serverEnv()`, a memoised function rather than a module-level constant, and the OpenRouter provider and Prisma client are both built lazily on first use. Startup validation still happens, `instrumentation.ts` just calls `serverEnv()` explicitly. Anything added later that reads env or opens a connection at import time will reintroduce this, so keep it lazy.

**Scope correction, agreed before building.** This feature originally read as wiring Prisma, Clerk, Arcjet and PostHog completely. That would quietly make feature 1 the entire foundation. Instead feature 1 *boots* all four, env validation, Clerk middleware and provider, a Prisma client singleton, PostHog with session replay and Clerk identity, and leaves the parts that genuinely belong to other features where they belong: Arcjet's actual rules ship with the endpoint in feature 6, and the real tables ship with feature 3.

#### What got built

- `infrastructure/env.ts`, zod-parsed server env behind `serverEnv()`, forced at boot by `instrumentation.ts`.
- `infrastructure/database.ts`, lazy Prisma 7 client over the `@prisma/adapter-pg` driver adapter, cached on `globalThis` in development so hot reload doesn't exhaust the connection pool.
- `prisma/schema.prisma`, generator plus one `User` model keyed to `clerkId`. Feature 3 extends this file.
- `proxy.ts`, `clerkMiddleware()`. Next 16 renamed the middleware entry point from `middleware.ts` to `proxy.ts`. It protects nothing yet on purpose, route gating is feature 8's call. *Partly superseded:* `POST /api/chat` requires sign-in as of feature 6's Arcjet layer, because the rate limit needs a real user to key on. Feature 8 still owns page visibility and sharing.
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

- [ ] Decide the approach
- [ ] Install lint, format, and whatever else is needed, and write it up in a coding-standards doc

### 3. Data model

The core things every feature depends on: users tied to Clerk, threads, each model's own messages inside a thread, and votes. A vote should only ever be possible on a turn where two or more models actually answered.

- [ ] Decide the approach
- [ ] Build it

### 4. Design & look

A coffee or dark brown background, warm, not neutral gray or true black. One accent color, rust, used only for things you interact with, buttons, links, focus states, the win-rate bar, never as decoration. Because the background and the accent are both warm tones from the same family, the accent has to stay clearly brighter and more saturated than the background, enough that a button never blends into the page behind it, that's a real risk with two warm colors this close and worth checking by eye, not just by the numbers. Blue, indigo, and purple are never the accent, under any circumstance. Green is reserved only for marking a winner, red only for errors, never reused for anything else. Contrast should genuinely hold up in both light and dark mode, not just look fine at a glance.

- [ ] Decide the approach
- [ ] Build it

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

**`POST /api/chat` now requires sign-in.** No Clerk `userId` means a 401 before Arcjet is called at all, which also means an unauthenticated request never costs a decision. *This contradicts feature 1, which parked route gating in feature 8, and the contradiction is resolved here rather than worked around:* the rate limit has no honest identity without an authenticated user, and IP keying would have quietly broken the "one person" promise above the moment two people shared a NAT. Feature 8 still owns page visibility and public thread sharing. The cost, accepted deliberately: nobody can try the arena without an account, so there is no signed-out demo.

**The guard runs before the body is parsed.** Nothing in it needs the body, and this ordering means malformed-body spam still spends a token instead of being a free way to hammer the endpoint.

**Bots are denied outright, `allow: []`.** This endpoint is only ever called by our own browser code. No crawler, monitor, or search engine has a reason to reach it, and everything it lets through spends real inference.

*Plan correction, found by building it.* This feature asked for "a shield against prompt injection" and that is **not shipped**. Arcjet bills prompt scanning as a usage-based add-on ($2 per 1M tokens) rather than including it in a plan, and on an account without it the rule does not degrade quietly: the server answers "Unable to detect prompt injection", the entire decision comes back `ERROR`, and every prompt pays a round trip for protection it never receives. Verified directly, then removed, and the dev log went from an error on every call to zero. Re-enabling it is two lines, documented in place in `chat-protection.ts`, once the add-on is actually on the account. Shipping it broken would have looked like protection while providing none, which is worse than not having it.

Denials never leak an Arcjet reason: 429 with a real retry-after for the bucket, 403 otherwise, each a plain sentence. `isErrored()` logs server-side and lets the request through, so an Arcjet outage degrades to an unprotected endpoint rather than a dead one.

- [x] Decide the approach *(Arcjet layer only)*
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

- [ ] Decide the approach
- [ ] Build it

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
