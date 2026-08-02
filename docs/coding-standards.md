# Coding standards

The conventions this project actually holds itself to. `docs/scope.md` is the plan; this is the shape of the code that comes out of it.

Two halves, kept honest about which is which: rules a machine enforces, and rules a person enforces. Nothing here is aspirational. If a rule is listed as enforced, there is a config line behind it and a probe that proved it fires.

## Tooling

| Command             | What it does                                          |
| ------------------- | ----------------------------------------------------- |
| `pnpm lint`         | ESLint, `--max-warnings=0`, so a warning is a failure |
| `pnpm typecheck`    | `tsc --noEmit`                                        |
| `pnpm format`       | Prettier writes the whole repo                        |
| `pnpm format:check` | Prettier verifies without writing                     |
| `pnpm build`        | A real production build                               |

**Prettier owns formatting, ESLint owns correctness.** They do not overlap. There is no `eslint-plugin-prettier`, so a formatting difference never shows up as a lint error, and lint output stays entirely about things that are actually wrong. Prettier config is `printWidth: 90` and defaults for everything else, plus `prettier-plugin-tailwindcss`, which sorts Tailwind classes into one canonical order so class-list churn stops showing up in diffs.

**The pre-commit hook is deliberately fast.** `husky` runs `lint-staged`, which runs `eslint --fix --max-warnings=0` and then Prettier, on staged files only. Typecheck and build are not in the hook. That is a choice, not an oversight: a full `tsc` on every commit grows with the codebase and is the thing people start skipping with `--no-verify`, and a hook that gets bypassed enforces nothing. Typecheck, lint and a real build are still required after every change, per `CLAUDE.md` — they just run at the point where the change is finished rather than at every save point along the way.

Vendored things are not ours to reformat: `.agents/`, `.claude/`, `generated/`, `prisma/migrations/` and the lockfile are all ignored by Prettier, and `generated/` by ESLint too.

## Enforced by the linter

**No `any`.** `@typescript-eslint/no-explicit-any` is an error, not the warning it ships as. A warning is an error everyone learns to scroll past.

**Type imports are inline.** `import { type Foo, bar }`, one import statement per module rather than a separate `import type` line.

**`const` by default, nothing reassigned in place.** `prefer-const`, `no-var`, and `no-param-reassign` including properties. Prefer `map`/`filter`/`reduce` over a loop that mutates an accumulator.

**`process.env` is banned outside two modules.** Configuration is read through `serverEnv()` in `infrastructure/env.ts` or `publicEnv` in `infrastructure/public-env.ts`, never directly. Only `NODE_ENV` and `NEXT_RUNTIME` are exempt everywhere, because they describe the runtime rather than configure the app.

This rule exists because it already went wrong once. A stray second Prisma client reached for `process.env.DATABASE_URL!` and quietly bypassed the fail-fast validation, so a missing variable would have surfaced as a confusing failure on someone's first prompt instead of a named crash at boot (`docs/scope.md`, feature 1). Config files that run outside Next — `prisma.config.ts`, `*.config.mjs` — are exempt because they cannot import a `server-only` module.

**Feature folders have real walls.** `no-restricted-imports` enforces the layering:

- A feature imports its own files **relatively** (`./chat-request`), and other layers through the alias (`@/infrastructure/env`).
- A feature may **not** import another feature, by alias or by climbing out with `../`. If two features need the same thing, it belongs in `infrastructure/`, or in a feature both can legitimately depend on.
- `infrastructure/` is the bottom layer. It imports no feature and no route.
- Nothing outside `app/` imports from `app/`. Routes and layouts compose features; features never reach back up.

**Accessibility has a floor.** The `jsx-a11y` rules that catch the things actually worth catching are errors: alt text, anchors with real content and real hrefs, valid ARIA roles and props, labels bound to controls, keyboard handlers alongside click handlers, focusable interactive elements, no autofocus. This is a floor, not the whole accessibility rule — see below.

**`console.log` is a warning, and warnings fail the build.** `console.error` and `console.warn` are allowed, because that is exactly how a real provider error survives server-side while the user sees a plain sentence. Debug logging is not that.

## Enforced by review

These are real rules with no honest lint rule behind them. A rule that approximates them would produce false confidence, which is worse than a written rule someone actually reads.

**Never show a raw exception or provider error to the user.** A plain human sentence and a retry action, always. The real error goes to the server log with `console.error`. This is already the pattern in `app/api/chat/route.ts` and `features/chat/chat-protection.ts` — a denial returns a sentence and a status, never an Arcjet reason.

**If the same handful of Tailwind classes shows up in three places, that is a component.** Shared spacing, color and repeated UI patterns live in `app/globals.css` or in a shared component, never copy-pasted across files.

**Keep env reads and connections lazy.** Anything that reads config or opens a connection does it on first use, inside a memoised function, not at module scope. `next build` evaluates route modules to collect page data, so an eager read makes a production build demand real secrets. `serverEnv()`, `arcjetClient()` and the Prisma client are all built this way, and anything new that touches config must be too.

**A vote is only ever created through `castVote`.** Nothing else inserts into `votes`. The rule that a vote needs two or more completed answers is application code by decision (`docs/scope.md`, feature 3), not a database constraint, so that one transactional function _is_ the constraint. A second insert path silently repeals it. The unique index on `turnId` still catches a duplicate, but nothing catches a vote on a turn only one model answered.

**Side effects at the edges.** Pure functions by default; no shared mutable state. Network calls, database writes and logging live in route handlers and clearly named effectful functions, not scattered through helpers.

**Accessibility beyond the linter.** Real contrast, a visible focus ring on everything focusable, and full keyboard operation on every screen. The lint rules catch missing labels and dead handlers; they cannot tell you a focus ring is invisible against a coffee-brown background. Check it by eye, in both themes.

**Cost always reads `$0.0000`, and that is correct.** Every model in this app is free tier. It is a real measured number, so it gets shown.

## File and naming conventions

- Folder by feature (`features/chat/`), never a layer-wide folder of every hook or every type.
- Files are `kebab-case.ts`; a file is named for the thing it exports (`stream-model-response.ts` exports `streamModelResponse`).
- Components are `PascalCase`, everything else `camelCase`, arrow-function consts over `function` declarations.
- Types are `Readonly` where they describe data that should not change; `type` over `interface` unless declaration merging is genuinely needed.
- Every non-obvious module opens with a short comment explaining **why** it is shaped the way it is, not what it does. The existing files under `infrastructure/` are the reference.
